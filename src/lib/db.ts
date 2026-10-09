/**
 * Postgres (Supabase free tier) via postgres.js. Pooled connection string.
 * Schema lives in src/lib/schema.sql and is applied by scripts/apply-schema.ts.
 *
 * House rule (from beebots): column lists are inlined literally in the tagged
 * templates — interpolating them would bind as a single $1 parameter.
 */

import postgres from "postgres";
import type { Comment, Fact, Person, PersonImage, Question, SessionUser, Union } from "./types";
import { deriveLiving } from "./facts";
import { sessionUserFromRow } from "./auth";
import { FAMILY_CLUSTER } from "./clusters";

let sql: postgres.Sql | null = null;
let poolBroken = false;

/**
 * Hard ceiling for any single query/transaction. Supavisor strips startup
 * parameters and overrides role-level statement_timeout, so the cap is
 * enforced client-side: if a query stalls (the pre-fix failure mode was
 * requests wedging for minutes against Vercel's execution limit), the timer
 * fires, the whole pool is marked broken, and the next getSql() rebuilds it.
 * Visitors get a fast error instead of a hang.
 */
const QUERY_TIMEOUT_MS = 8_000;

function tripBreaker(): void {
  poolBroken = true;
  const stale = sql;
  sql = null;
  if (stale) void stale.end({ timeout: 1 }).catch(() => {});
}

async function withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`kin db timeout: ${label} exceeded ${QUERY_TIMEOUT_MS}ms`)),
      QUERY_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("kin db timeout")) tripBreaker();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Transparent wrapper over the postgres.js pool: tagged-template calls return
 * the composable Query object untouched (so nested sql`` fragments keep
 * working), but its `then` — the await point — is wrapped to race against
 * QUERY_TIMEOUT_MS. Non-template method calls (unsafe, begin, file, etc.)
 * have their returned promises guarded directly.
 */
function guardQuery<T extends { then: unknown }>(q: T): T {
  if (typeof q.then !== "function" || (q as { __kinGuarded?: boolean }).__kinGuarded) return q;
  const orig = (q.then as (...a: unknown[]) => unknown).bind(q);
  Object.defineProperty(q, "then", {
    value: (res: unknown, rej: unknown) =>
      withTimeout(new Promise((resolve, reject) => orig(resolve, reject)), "query").then(res as never, rej as never),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(q, "__kinGuarded", { value: true });
  return q;
}

function guard(raw: postgres.Sql): postgres.Sql {
  const call = (...args: unknown[]) => {
    const r = (raw as unknown as (...a: unknown[]) => unknown)(...args);
    // Tagged template → object with strings+then; guard its await point only.
    if (r !== null && typeof r === "object" && Array.isArray((r as { strings?: unknown }).strings)) {
      return guardQuery(r as { then: unknown });
    }
    return r instanceof Promise ? withTimeout(r, "query") : r;
  };
  return new Proxy(call as unknown as postgres.Sql, {
    get(_t, prop) {
      if (prop === "end") return raw.end.bind(raw);
      const v = Reflect.get(raw, prop, raw);
      if (typeof v !== "function") return v;
      return (...args: unknown[]) => {
        const r = (v as (...a: unknown[]) => unknown).apply(raw, args);
        if (r !== null && typeof r === "object" && Array.isArray((r as { strings?: unknown }).strings)) {
          return guardQuery(r as { then: unknown });
        }
        return r instanceof Promise ? withTimeout(r, String(prop)) : r;
      };
    },
    apply(_t, _thisArg, args) {
      return call(...args) as never;
    },
  });
}

export function getSql(): postgres.Sql {
  if (poolBroken) poolBroken = false; // rebuild after a tripped breaker
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    sql = postgres(url, {
      prepare: false, // required for Supabase pooled connections
      // One connection per process: session pooler (5432) caps clients at
      // pool_size 15, and Vercel runs one instance per concurrent request.
      // Queries from Promise.all pipeline over this single socket, which the
      // session pooler handles fine (transaction mode on 6543 does NOT — it
      // silently drops pipelined batches and pages hang forever).
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return guard(sql);
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

// ---- people ----------------------------------------------------------------

function personFromRow(r: Record<string, unknown>): Person {
  const living = Boolean(r.living);
  return {
    id: Number(r.id),
    fullName: String(r.full_name),
    cluster: String(r.cluster ?? FAMILY_CLUSTER),
    nameNote: r.name_note === null ? null : String(r.name_note),
    aliases: Array.isArray(r.aliases) ? r.aliases.map(String) : [],
    sex: r.sex === null ? null : (String(r.sex) as Person["sex"]),
    birthDate: r.birth_date === null ? null : String(r.birth_date),
    birthPlace: r.birth_place === null ? null : String(r.birth_place),
    deathDate: r.death_date === null ? null : String(r.death_date),
    deathPlace: r.death_place === null ? null : String(r.death_place),
    notes: r.notes === null ? null : String(r.notes),
    // Defense in depth: a recorded death always reads as not-alive, even if a
    // stale row somehow holds living=true (see deriveLiving).
    living: deriveLiving({
      deathDate: r.death_date === null ? null : String(r.death_date),
      deathPlace: r.death_place === null ? null : String(r.death_place),
      living,
    }),
    createdBy: String(r.created_by),
    createdAt: Number(r.created_at),
  };
}

const PERSON_COLS = `id, full_name, cluster, name_note, aliases, sex, birth_date, birth_place,
  death_date, death_place, notes, living, created_by, created_at`;

/**
 * Every person in one cluster. Defaults to the family tree: a caller that
 * forgets the argument can only ever read too narrowly, never leak a
 * speculative line into the tree (see src/lib/clusters.ts).
 */
export async function allPeople(cluster: string = FAMILY_CLUSTER): Promise<Person[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, full_name, cluster, name_note, aliases, sex, birth_date, birth_place,
           death_date, death_place, notes, living, created_by, created_at
    FROM people WHERE cluster = ${cluster} ORDER BY id
  `;
  return rows.map(personFromRow);
}

/** Deliberately unscoped by cluster: a person is reachable by id so that their
 * own page can read their cluster off the row and scope everything else to it. */
export async function getPerson(id: number): Promise<Person | null> {
  const db = getSql();
  const rows = await db`
    SELECT id, full_name, cluster, name_note, aliases, sex, birth_date, birth_place,
           death_date, death_place, notes, living, created_by, created_at
    FROM people WHERE id = ${id}
  `;
  return rows.length ? personFromRow(rows[0]) : null;
}

/** How many people and unions each cluster holds — the selector's options. */
export async function clusterCounts(): Promise<
  { cluster: string; people: number; unions: number }[]
> {
  const db = getSql();
  const [peopleRows, unionRows] = await Promise.all([
    db`SELECT cluster, count(*)::int AS n FROM people GROUP BY cluster`,
    db`SELECT cluster, count(*)::int AS n FROM unions GROUP BY cluster`,
  ]);
  const keys = [...new Set([...peopleRows, ...unionRows].map((r) => String(r.cluster)))].sort();
  const countOf = (rows: Record<string, unknown>[], cluster: string) =>
    Number(rows.find((r) => String(r.cluster) === cluster)?.n ?? 0);
  return keys.map((cluster) => ({
    cluster,
    people: countOf(peopleRows, cluster),
    unions: countOf(unionRows, cluster),
  }));
}

export async function insertPerson(
  p: Omit<Person, "id" | "createdAt" | "cluster">,
  now: number,
  cluster: string = FAMILY_CLUSTER,
): Promise<Person> {
  const db = getSql();
  const rows = await db`
    INSERT INTO people (full_name, cluster, name_note, aliases, sex, birth_date, birth_place, death_date, death_place, notes, living, created_by, created_at)
    VALUES (${p.fullName}, ${cluster}, ${p.nameNote}, ${p.aliases ?? []}, ${p.sex}, ${p.birthDate}, ${p.birthPlace},
            ${p.deathDate}, ${p.deathPlace}, ${p.notes}, ${p.living}, ${p.createdBy}, ${now})
    RETURNING id, full_name, cluster, name_note, aliases, sex, birth_date, birth_place,
              death_date, death_place, notes, living, created_by, created_at
  `;
  return personFromRow(rows[0]);
}

/**
 * Create a person AND their family link in ONE pooler transaction.
 *
 * The add-relative flow used to run 3-4 separate auto-commit statements,
 * each potentially landing on a different pooled connection. Under load
 * that both multiplies latency (minutes-long hangs were observed) and
 * leaves a window where the person exists without their link. One
 * transaction = one connection, all-or-nothing, no window.
 */
export async function createPersonWithLink(
  p: Omit<Person, "id" | "createdAt" | "cluster">,
  now: number,
  link:
    | { kind: "child-of"; parentId: number }
    | { kind: "parent-of"; childId: number; marriageDate: string | null; marriagePlace: string | null }
    | { kind: "partner-of"; partnerId: number; marriageDate: string | null; marriagePlace: string | null }
    | null,
  cluster: string = FAMILY_CLUSTER,
): Promise<{ person: Person; unionId: number | null }> {
  const db = getSql();
  return await db.begin(async (t) => {
    // Cluster safety: a link joins two people of ONE cluster, so a new relative
    // inherits the cluster of the person they hang off. Adding a parent from a
    // Lissanoure profile must not drop a family-tree row into the tree.
    const anchorId =
      link?.kind === "child-of"
        ? link.parentId
        : link?.kind === "parent-of"
          ? link.childId
          : link?.kind === "partner-of"
            ? link.partnerId
            : null;
    if (anchorId !== null) {
      const anchor = await t`SELECT cluster FROM people WHERE id = ${anchorId}`;
      if (anchor.length) cluster = String(anchor[0].cluster);
    }

    const rows = await t`
      INSERT INTO people (full_name, cluster, name_note, aliases, sex, birth_date, birth_place, death_date, death_place, notes, living, created_by, created_at)
      VALUES (${p.fullName}, ${cluster}, ${p.nameNote}, ${p.aliases ?? []}, ${p.sex}, ${p.birthDate}, ${p.birthPlace},
              ${p.deathDate}, ${p.deathPlace}, ${p.notes}, ${p.living}, ${p.createdBy}, ${now})
      RETURNING id, full_name, cluster, name_note, aliases, sex, birth_date, birth_place,
                death_date, death_place, notes, living, created_by, created_at
    `;
    const person = personFromRow(rows[0]);
    let unionId: number | null = null;

    if (link?.kind === "child-of") {
      const unions = await t`SELECT id, partner_a, partner_b FROM unions WHERE cluster = ${cluster} AND (partner_a = ${link.parentId} OR partner_b = ${link.parentId}) ORDER BY id LIMIT 1`;
      if (unions.length) {
        unionId = Number(unions[0].id);
      } else {
        const created = await t`
          INSERT INTO unions (partner_a, partner_b, marriage_date, marriage_place, cluster, created_by, created_at)
          VALUES (${link.parentId}, NULL, NULL, NULL, ${cluster}, ${p.createdBy}, ${now})
          RETURNING id
        `;
        unionId = Number(created[0].id);
      }
      await t`INSERT INTO children (union_id, person_id) VALUES (${unionId}, ${person.id}) ON CONFLICT DO NOTHING`;
    }

    if (link?.kind === "parent-of") {
      const parentUnionIds = await t`SELECT union_id FROM children WHERE person_id = ${link.childId}`;
      const ids = parentUnionIds.map((r) => Number(r.union_id));
      let filled = false;
      if (ids.length) {
        const open = await t`SELECT id FROM unions WHERE id IN ${t(ids)} AND partner_b IS NULL AND cluster = ${cluster} LIMIT 1`;
        if (open.length) {
          await t`UPDATE unions SET partner_b = ${person.id} WHERE id = ${Number(open[0].id)}`;
          unionId = Number(open[0].id);
          filled = true;
        }
      }
      if (!filled) {
        const created = await t`
          INSERT INTO unions (partner_a, partner_b, marriage_date, marriage_place, cluster, created_by, created_at)
          VALUES (${person.id}, NULL, ${link.marriageDate}, ${link.marriagePlace}, ${cluster}, ${p.createdBy}, ${now})
          RETURNING id
        `;
        unionId = Number(created[0].id);
        await t`INSERT INTO children (union_id, person_id) VALUES (${unionId}, ${link.childId}) ON CONFLICT DO NOTHING`;
      }
    }

    if (link?.kind === "partner-of") {
      const created = await t`
        INSERT INTO unions (partner_a, partner_b, marriage_date, marriage_place, cluster, created_by, created_at)
        VALUES (${link.partnerId}, ${person.id}, ${link.marriageDate}, ${link.marriagePlace}, ${cluster}, ${p.createdBy}, ${now})
        RETURNING id
      `;
      unionId = Number(created[0].id);
    }

    return { person, unionId };
  });
}

/** Caller passes the complete field set (this is a full-row update, not a patch).
 * Deliberately does NOT move the person between clusters: which research line
 * someone belongs to is a decision, not an edit (see src/lib/clusters.ts). */
export async function updatePerson(id: number, p: Person): Promise<Person | null> {
  const db = getSql();
  const rows = await db`
    UPDATE people SET
      full_name = ${p.fullName},
      name_note = ${p.nameNote},
      aliases = ${p.aliases},
      sex = ${p.sex},
      birth_date = ${p.birthDate},
      birth_place = ${p.birthPlace},
      death_date = ${p.deathDate},
      death_place = ${p.deathPlace},
      notes = ${p.notes},
      living = ${p.living}
    WHERE id = ${id}
    RETURNING id, full_name, cluster, name_note, aliases, sex, birth_date, birth_place,
              death_date, death_place, notes, living, created_by, created_at
  `;
  return rows.length ? personFromRow(rows[0]) : null;
}

// ---- unions + children -----------------------------------------------------

function unionFromRow(r: Record<string, unknown>): Union {
  return {
    id: Number(r.id),
    cluster: String(r.cluster ?? FAMILY_CLUSTER),
    partnerA: Number(r.partner_a),
    partnerB: r.partner_b === null ? null : Number(r.partner_b),
    marriageDate: r.marriage_date === null ? null : String(r.marriage_date),
    marriagePlace: r.marriage_place === null ? null : String(r.marriage_place),
    createdBy: String(r.created_by),
    createdAt: Number(r.created_at),
  };
}

export async function allUnions(cluster: string = FAMILY_CLUSTER): Promise<Union[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, cluster, partner_a, partner_b, marriage_date, marriage_place, created_by, created_at
    FROM unions WHERE cluster = ${cluster} ORDER BY id
  `;
  return rows.map(unionFromRow);
}

export async function insertUnion(
  u: Omit<Union, "id" | "createdAt" | "cluster">,
  now: number,
  cluster: string = FAMILY_CLUSTER,
): Promise<Union> {
  const db = getSql();
  const rows = await db`
    INSERT INTO unions (partner_a, partner_b, marriage_date, marriage_place, cluster, created_by, created_at)
    VALUES (${u.partnerA}, ${u.partnerB}, ${u.marriageDate}, ${u.marriagePlace}, ${cluster}, ${u.createdBy}, ${now})
    RETURNING id, cluster, partner_a, partner_b, marriage_date, marriage_place, created_by, created_at
  `;
  return unionFromRow(rows[0]);
}

/**
 * Link a child to a couple. Refuses a cross-cluster link outright: silently
 * attaching a speculative person to a family union is the one write that could
 * drag research into the tree, so it fails loudly instead.
 */
export async function addChild(unionId: number, personId: number): Promise<void> {
  const db = getSql();
  const rows = await db`
    SELECT (SELECT cluster FROM unions WHERE id = ${unionId}) AS union_cluster,
           (SELECT cluster FROM people WHERE id = ${personId}) AS person_cluster
  `;
  const unionCluster = rows.length ? rows[0].union_cluster : null;
  const personCluster = rows.length ? rows[0].person_cluster : null;
  if (unionCluster === null || personCluster === null || String(unionCluster) !== String(personCluster)) {
    throw new Error(
      `refusing cross-cluster child link: union ${unionId} (${unionCluster ?? "missing"}) vs person ${personId} (${personCluster ?? "missing"})`,
    );
  }
  await db`INSERT INTO children (union_id, person_id) VALUES (${unionId}, ${personId}) ON CONFLICT DO NOTHING`;
}

/** Fill blank marriage fields on an existing union (used by GEDCOM merge). */
export async function updateUnionMeta(
  id: number,
  meta: { marriageDate: string | null; marriagePlace: string | null },
): Promise<void> {
  const db = getSql();
  await db`UPDATE unions SET
    marriage_date = COALESCE(marriage_date, ${meta.marriageDate}),
    marriage_place = COALESCE(marriage_place, ${meta.marriagePlace})
  WHERE id = ${id}`;
}

export async function childLinks(
  cluster: string = FAMILY_CLUSTER,
): Promise<{ unionId: number; personId: number }[]> {
  const db = getSql();
  // BOTH ends must sit in the cluster: a hand-written or future cross-cluster
  // row stays invisible instead of dragging a speculative person into the tree.
  const rows = await db`
    SELECT c.union_id, c.person_id
    FROM children c
    JOIN unions u ON u.id = c.union_id
    JOIN people p ON p.id = c.person_id
    WHERE u.cluster = ${cluster} AND p.cluster = ${cluster}
  `;
  return rows.map((r) => ({ unionId: Number(r.union_id), personId: Number(r.person_id) }));
}

// ---- facts -------------------------------------------------------------------

function factFromRow(r: Record<string, unknown>): Fact {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    kind: String(r.kind) as Fact["kind"],
    detail: String(r.detail),
    source: r.source === null ? null : String(r.source),
    sourceUrl: r.source_url === null ? null : String(r.source_url),
    sourceKind: (String(r.source_kind) as Fact["sourceKind"]) || "unspecified",
    confidence: String(r.confidence) as Fact["confidence"],
    createdBy: String(r.created_by),
    createdAt: Number(r.created_at),
  };
}

export async function factsFor(personId: number): Promise<Fact[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, person_id, kind, detail, source, source_url, source_kind, confidence, created_by, created_at
    FROM facts WHERE person_id = ${personId} ORDER BY created_at
  `;
  return rows.map(factFromRow);
}

export async function allFacts(cluster: string = FAMILY_CLUSTER): Promise<Fact[]> {
  const db = getSql();
  const rows = await db`
    SELECT f.id, f.person_id, f.kind, f.detail, f.source, f.source_url, f.source_kind, f.confidence, f.created_by, f.created_at
    FROM facts f JOIN people p ON p.id = f.person_id
    WHERE p.cluster = ${cluster}
    ORDER BY f.person_id, f.created_at
  `;
  return rows.map(factFromRow);
}

export async function insertFact(f: Omit<Fact, "id" | "createdAt">, now: number): Promise<Fact> {
  const db = getSql();
  const rows = await db`
    INSERT INTO facts (person_id, kind, detail, source, source_url, source_kind, confidence, created_by, created_at)
    VALUES (${f.personId}, ${f.kind}, ${f.detail}, ${f.source}, ${f.sourceUrl}, ${f.sourceKind}, ${f.confidence}, ${f.createdBy}, ${now})
    RETURNING id, person_id, kind, detail, source, source_url, source_kind, confidence, created_by, created_at
  `;
  return factFromRow(rows[0]);
}

// ---- images ------------------------------------------------------------------

function imageFromRow(r: Record<string, unknown>): PersonImage {
  return {
    id: Number(r.id),
    personId: Number(r.person_id),
    mime: String(r.mime),
    bytes: Number(r.bytes),
    width: r.width === null ? null : Number(r.width),
    height: r.height === null ? null : Number(r.height),
    caption: String(r.caption),
    source: String(r.source),
    addedBy: String(r.added_by),
    createdAt: Number(r.created_at),
  };
}

/** Gallery metadata only — the heavy bytes live in image_blobs. */
export async function imagesFor(personId: number): Promise<PersonImage[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, person_id, mime, bytes, width, height, caption, source, added_by, created_at
    FROM images WHERE person_id = ${personId} ORDER BY created_at, id
  `;
  return rows.map(imageFromRow);
}

/** Metadata + bytes in one pooler transaction — no image without its blob. */
export async function insertImage(
  meta: Omit<PersonImage, "id" | "createdAt">,
  data: Buffer,
  now: number,
): Promise<PersonImage> {
  const db = getSql();
  return await db.begin(async (t) => {
    const rows = await t`
      INSERT INTO images (person_id, mime, bytes, width, height, caption, source, added_by, created_at)
      VALUES (${meta.personId}, ${meta.mime}, ${meta.bytes}, ${meta.width}, ${meta.height},
              ${meta.caption}, ${meta.source}, ${meta.addedBy}, ${now})
      RETURNING id, person_id, mime, bytes, width, height, caption, source, added_by, created_at
    `;
    const image = imageFromRow(rows[0]);
    await t`INSERT INTO image_blobs (image_id, data) VALUES (${image.id}, ${data})`;
    return image;
  });
}

export async function imageBlob(
  id: number,
): Promise<{ mime: string; data: Buffer } | null> {
  const db = getSql();
  const rows = await db`
    SELECT m.mime, b.data
    FROM images m JOIN image_blobs b ON b.image_id = m.id
    WHERE m.id = ${id}
  `;
  if (!rows.length) return null;
  return { mime: String(rows[0].mime), data: Buffer.from(rows[0].data as Uint8Array) };
}

/** Returns what was deleted (for the activity log), or null if already gone. */
export async function deleteImage(
  id: number,
): Promise<{ personId: number; caption: string } | null> {
  const db = getSql();
  const rows = await db`DELETE FROM images WHERE id = ${id} RETURNING person_id, caption`;
  return rows.length
    ? { personId: Number(rows[0].person_id), caption: String(rows[0].caption) }
    : null;
}

// ---- comments ----------------------------------------------------------------

function commentFromRow(r: Record<string, unknown>): Comment {
  return {
    id: Number(r.id),
    personId: r.person_id === null ? null : Number(r.person_id),
    unionId: r.union_id === null ? null : Number(r.union_id),
    author: String(r.author),
    body: String(r.body),
    createdAt: Number(r.created_at),
  };
}

export async function commentsForPerson(personId: number): Promise<Comment[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, person_id, union_id, author, body, created_at
    FROM comments WHERE person_id = ${personId} ORDER BY created_at
  `;
  return rows.map(commentFromRow);
}

export async function commentsForUnion(unionId: number): Promise<Comment[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, person_id, union_id, author, body, created_at
    FROM comments WHERE union_id = ${unionId} ORDER BY created_at
  `;
  return rows.map(commentFromRow);
}

export async function insertComment(
  c: Omit<Comment, "id" | "createdAt">,
  now: number,
): Promise<Comment> {
  const db = getSql();
  const rows = await db`
    INSERT INTO comments (person_id, union_id, author, body, created_at)
    VALUES (${c.personId}, ${c.unionId}, ${c.author}, ${c.body}, ${now})
    RETURNING id, person_id, union_id, author, body, created_at
  `;
  return commentFromRow(rows[0]);
}

// ---- questions ----------------------------------------------------------------

function questionFromRow(r: Record<string, unknown>): Question {
  return {
    id: Number(r.id),
    personId: r.person_id === null ? null : Number(r.person_id),
    title: String(r.title),
    detail: r.detail === null ? null : String(r.detail),
    status: r.status === "answered" ? "answered" : "open",
    raisedBy: String(r.raised_by),
    createdAt: Number(r.created_at),
    answeredAt: r.answered_at === null ? null : Number(r.answered_at),
  };
}

export async function allQuestions(): Promise<Question[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, person_id, title, detail, status, raised_by, created_at, answered_at
    FROM questions ORDER BY status, created_at DESC
  `;
  return rows.map(questionFromRow);
}

export async function questionsForPerson(personId: number): Promise<Question[]> {
  const db = getSql();
  const rows = await db`
    SELECT id, person_id, title, detail, status, raised_by, created_at, answered_at
    FROM questions WHERE person_id = ${personId} ORDER BY created_at DESC
  `;
  return rows.map(questionFromRow);
}

export async function insertQuestion(
  q: Omit<Question, "id" | "status" | "answeredAt">,
  now: number,
): Promise<Question> {
  const db = getSql();
  const rows = await db`
    INSERT INTO questions (person_id, title, detail, status, raised_by, created_at)
    VALUES (${q.personId}, ${q.title}, ${q.detail}, 'open', ${q.raisedBy}, ${now})
    RETURNING id, person_id, title, detail, status, raised_by, created_at, answered_at
  `;
  return questionFromRow(rows[0]);
}

export async function answerQuestion(id: number, now: number): Promise<void> {
  const db = getSql();
  await db`UPDATE questions SET status = 'answered', answered_at = ${now} WHERE id = ${id}`;
}

export async function reopenQuestion(id: number): Promise<void> {
  const db = getSql();
  await db`UPDATE questions SET status = 'open', answered_at = NULL WHERE id = ${id}`;
}

// ---- users / sessions / invites -------------------------------------------------

export async function userByEmail(email: string): Promise<Record<string, unknown> | null> {
  const db = getSql();
  const rows = await db`SELECT email, name, role, password_hash, created_at FROM users WHERE email = ${email}`;
  return rows.length ? rows[0] : null;
}

export async function insertUser(
  email: string,
  name: string,
  role: "owner" | "member",
  passwordHash: string,
  now: number,
): Promise<void> {
  const db = getSql();
  await db`
    INSERT INTO users (email, name, role, password_hash, created_at)
    VALUES (${email}, ${name}, ${role}, ${passwordHash}, ${now})
  `;
}

export async function insertSession(
  token: string,
  email: string,
  now: number,
  expiresAt: number,
): Promise<void> {
  const db = getSql();
  await db`INSERT INTO sessions (token, email, created_at, expires_at) VALUES (${token}, ${email}, ${now}, ${expiresAt})`;
}

export async function sessionUser(token: string, now: number): Promise<SessionUser | null> {
  const db = getSql();
  const rows = await db`
    SELECT u.email, u.name, u.role
    FROM sessions s JOIN users u ON u.email = s.email
    WHERE s.token = ${token} AND s.expires_at > ${now}
  `;
  return rows.length ? sessionUserFromRow(rows[0]) : null;
}

export async function deleteSession(token: string): Promise<void> {
  const db = getSql();
  await db`DELETE FROM sessions WHERE token = ${token}`;
}

export async function validInvite(code: string): Promise<boolean> {
  const db = getSql();
  const rows = await db`SELECT used_by FROM invites WHERE code = ${code}`;
  return rows.length > 0 && rows[0].used_by === null;
}

export async function consumeInvite(code: string, email: string, now: number): Promise<void> {
  const db = getSql();
  await db`UPDATE invites SET used_by = ${email}, used_at = ${now} WHERE code = ${code} AND used_by IS NULL`;
}

export async function insertInvite(
  code: string,
  note: string,
  createdBy: string,
  now: number,
): Promise<void> {
  const db = getSql();
  await db`INSERT INTO invites (code, note, created_by, created_at) VALUES (${code}, ${note}, ${createdBy}, ${now})`;
}

export async function allInvites(): Promise<Record<string, unknown>[]> {
  const db = getSql();
  return await db`SELECT code, note, created_by, created_at, used_by, used_at FROM invites ORDER BY created_at DESC`;
}

// ---- activity --------------------------------------------------------------------

export async function logActivity(
  actor: string,
  verb: string,
  target: string,
  detail: string | null,
  now: number,
): Promise<void> {
  const db = getSql();
  await db`INSERT INTO activity (actor, verb, target, detail, created_at) VALUES (${actor}, ${verb}, ${target}, ${detail}, ${now})`;
}

export async function recentActivity(limit: number): Promise<Record<string, unknown>[]> {
  const db = getSql();
  return await db`
    SELECT actor, verb, target, detail, created_at
    FROM activity ORDER BY created_at DESC, id DESC LIMIT ${limit}
  `;
}
