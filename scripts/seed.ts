/**
 * Seeds the database with the transcribed tree + starter questions.
 *   npm run seed
 * Rebuilds tree content (people, unions, children, facts, questions) —
 * users, sessions, invites and the activity log are kept except for the
 * initial "seeded" entry.
 *
 * Refuses to run while a research cluster exists (--force overrides): the
 * truncate is database-wide and would take speculative research lines with it.
 */

import postgres from "postgres";
import {
  seedChildren,
  seedPeople,
  seedQuestions,
  seedUnions,
  SEED_SOURCE,
} from "../src/lib/seed-data.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const now = Date.now();

try {
  // The TRUNCATE below is database-wide, so it would take any research cluster
  // with it (see src/lib/clusters.ts). Refuse rather than silently delete
  // research: re-seeding the family tree is a fresh-database operation.
  const research = await sql`
    SELECT cluster, count(*)::int AS n FROM people WHERE cluster <> 'family' GROUP BY cluster
  `;
  if (research.length && !process.argv.includes("--force")) {
    console.error(
      "refusing: this database holds research clusters (" +
        research.map((r) => `${String(r.cluster)}: ${r.n} people`).join(", ") +
        "). Re-run with --force to wipe them too.",
    );
    process.exit(1);
  }

  await sql.unsafe(
    "TRUNCATE facts, comments, children, unions, questions, people RESTART IDENTITY CASCADE",
  );

  // People
  const ids: number[] = [];
  for (const p of seedPeople()) {
    // `::text::jsonb`, not `::jsonb`: a value bound next to a bare jsonb cast is
    // serialised by postgres.js itself, which double-encodes it (see db.ts).
    const rows = await sql`
      INSERT INTO people (full_name, name_note, aliases, sex, birth_date, birth_place, death_date, death_place, notes, living, created_by, created_at, research_evidence)
      VALUES (${p.fullName}, ${p.nameNote}, ${p.aliases ?? []}, ${p.sex}, ${p.birthDate}, ${p.birthPlace},
              ${p.deathDate}, ${p.deathPlace}, ${p.notes}, ${p.living}, ${p.createdBy}, ${now}, ${p.researchEvidence ? JSON.stringify(p.researchEvidence) : null}::text::jsonb)
      RETURNING id
    `;
    ids.push(Number(rows[0].id));
  }
  console.log(`people: ${ids.length}`);

  // Unions
  const unionIds: number[] = [];
  for (const u of seedUnions()) {
    const rows = await sql`
      INSERT INTO unions (partner_a, partner_b, created_by, created_at)
      VALUES (${ids[u.a]}, ${ids[u.b]}, ${"seed"}, ${now})
      RETURNING id
    `;
    unionIds.push(Number(rows[0].id));
  }
  console.log(`unions: ${unionIds.length}`);

  // Children: each {union, children} refers to seedUnions() by position.
  const childRows: { unionId: number; personId: number }[] = [];
  for (const group of seedChildren()) {
    const unionId = unionIds[group.union];
    for (const childIdx of group.children) {
      childRows.push({ unionId, personId: ids[childIdx] });
    }
  }
  for (const link of childRows) {
    await sql`INSERT INTO children (union_id, person_id) VALUES (${link.unionId}, ${link.personId})`;
  }
  console.log(`child links: ${childRows.length}`);

  // Starter fact on every person: where the record came from.
  for (const id of ids) {
    await sql`
      INSERT INTO facts (person_id, kind, detail, source, confidence, created_by, created_at)
      VALUES (${id}, ${"note"}, ${"Name and dates transcribed from michael's Ancestry tree."}, ${SEED_SOURCE}, ${"likely"}, ${"seed"}, ${now})
    `;
  }

  // Starter questions
  for (const q of seedQuestions()) {
    await sql`
      INSERT INTO questions (person_id, title, detail, status, raised_by, created_at)
      VALUES (${q.person === null ? null : ids[q.person]}, ${q.title}, ${q.detail}, ${"open"}, ${"seed"}, ${now})
    `;
  }
  console.log(`starter questions: ${seedQuestions().length}`);

  await sql`
    INSERT INTO activity (actor, verb, target, detail, created_at)
    VALUES (${"seed"}, ${"seeded"}, ${"the tree"}, ${"Initial tree from michael's Ancestry screenshot (12 people, 5 couples)."}, ${now})
  `;
  console.log("done.");
} finally {
  await sql.end();
}
