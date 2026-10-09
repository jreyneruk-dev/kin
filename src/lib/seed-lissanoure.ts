/**
 * Seeds the speculative Lissanoure cluster (src/lib/seed-lissanoure-data.ts).
 *
 * Idempotent by construction: every person is matched on (cluster, full_name)
 * and updated in place, facts are matched on (person, kind, detail), unions on
 * their partners, so an interrupted or repeated run completes the pedigree
 * instead of duplicating it. It writes only to cluster 'lissanoure' and refuses
 * to touch any other cluster — the family tree cannot be edited from here.
 *
 * Returns a report rather than logging, so the CLI prints it and the test suite
 * asserts on it.
 */

import type postgres from "postgres";
import { LISSANOURE_CLUSTER } from "./clusters";
import {
  lissanoureChildren,
  lissanourePeople,
  lissanoureUnions,
} from "./seed-lissanoure-data";

export const LISSANOURE_SEEDED_BY = "seed:lissanoure";

export interface LissanoureSeedReport {
  cluster: string;
  insertedPeople: number;
  insertedUnions: number;
  insertedChildLinks: number;
  insertedFacts: number;
  /** People in the cluster after the run. */
  peopleInCluster: number;
  /** Seeded names found in ANY other cluster — must be empty. */
  strays: string[];
}

export async function seedLissanoure(
  sql: postgres.Sql,
  now: number = Date.now(),
): Promise<LissanoureSeedReport> {
  const inserted = { insertedPeople: 0, insertedUnions: 0, insertedChildLinks: 0, insertedFacts: 0 };
  const ids = new Map<string, number>();

  await sql.begin(async (tx) => {
    // Idempotency key = the name, claimed in id order. Genealogies repeat names
    // — this line has two George Macartneys of Lissanoure, father and son — so
    // each data entry claims the NEXT existing row of that name instead of all
    // of them looking up the same one.
    const existing = await tx`
      SELECT id, full_name FROM people WHERE cluster = ${LISSANOURE_CLUSTER} ORDER BY id
    `;
    const unclaimed = new Map<string, number[]>();
    for (const row of existing) {
      const name = String(row.full_name);
      unclaimed.set(name, [...(unclaimed.get(name) ?? []), Number(row.id)]);
    }
    const claim = (fullName: string): number | undefined => unclaimed.get(fullName)?.shift();

    for (const p of lissanourePeople()) {
      // living mirrors how the app reads a row: no death recorded = living.
      const living = !p.deathDate && !p.deathPlace;
      const existingId = claim(p.fullName);
      let id: number;
      if (existingId !== undefined) {
        id = existingId;
        await tx`
          UPDATE people SET
            aliases = ${p.aliases ?? []}, sex = ${p.sex},
            birth_date = ${p.birthDate}, birth_place = ${p.birthPlace},
            death_date = ${p.deathDate}, death_place = ${p.deathPlace},
            notes = ${p.notes}, living = ${living}
          WHERE id = ${id}
        `;
      } else {
        const rows = await tx`
          INSERT INTO people (full_name, aliases, sex, birth_date, birth_place,
                              death_date, death_place, notes, living, cluster, created_by, created_at)
          VALUES (${p.fullName}, ${p.aliases ?? []}, ${p.sex}, ${p.birthDate},
                  ${p.birthPlace}, ${p.deathDate}, ${p.deathPlace}, ${p.notes}, ${living},
                  ${LISSANOURE_CLUSTER}, ${LISSANOURE_SEEDED_BY}, ${now})
          RETURNING id
        `;
        id = Number(rows[0].id);
        inserted.insertedPeople++;
      }
      ids.set(p.key, id);

      for (const fact of p.facts) {
        const have = await tx`
          SELECT id FROM facts
          WHERE person_id = ${id} AND kind = ${fact.kind} AND detail = ${fact.detail}
          LIMIT 1
        `;
        if (have.length) continue;
        await tx`
          INSERT INTO facts (person_id, kind, detail, source, source_url, source_kind,
                             confidence, created_by, created_at)
          VALUES (${id}, ${fact.kind}, ${fact.detail}, ${fact.source}, ${fact.sourceUrl},
                  ${fact.sourceKind}, ${fact.confidence}, ${LISSANOURE_SEEDED_BY}, ${now})
        `;
        inserted.insertedFacts++;
      }
    }

    const unionIds: number[] = [];
    for (const u of lissanoureUnions()) {
      const a = ids.get(u.a);
      const partnerKey = u.b;
      const b = partnerKey === null ? null : (ids.get(partnerKey) ?? null);
      if (a === undefined || (partnerKey !== null && b === null)) {
        throw new Error(`seed data error: union references an unknown person key (${u.a} x ${partnerKey})`);
      }
      const found =
        b === null
          ? await tx`
              SELECT id FROM unions
              WHERE cluster = ${LISSANOURE_CLUSTER} AND partner_a = ${a} AND partner_b IS NULL
              ORDER BY id LIMIT 1
            `
          : await tx`
              SELECT id FROM unions
              WHERE cluster = ${LISSANOURE_CLUSTER}
                AND ((partner_a = ${a} AND partner_b = ${b}) OR (partner_a = ${b} AND partner_b = ${a}))
              ORDER BY id LIMIT 1
            `;
      if (found.length) {
        const id = Number(found[0].id);
        // COALESCE, like updateUnionMeta: a filled-in marriage is never clobbered.
        await tx`
          UPDATE unions SET
            marriage_date = COALESCE(marriage_date, ${u.marriageDate}),
            marriage_place = COALESCE(marriage_place, ${u.marriagePlace})
          WHERE id = ${id}
        `;
        unionIds.push(id);
      } else {
        const rows = await tx`
          INSERT INTO unions (partner_a, partner_b, marriage_date, marriage_place, cluster, created_by, created_at)
          VALUES (${a}, ${b}, ${u.marriageDate}, ${u.marriagePlace}, ${LISSANOURE_CLUSTER},
                  ${LISSANOURE_SEEDED_BY}, ${now})
          RETURNING id
        `;
        unionIds.push(Number(rows[0].id));
        inserted.insertedUnions++;
      }
    }

    for (const link of lissanoureChildren()) {
      const unionId = unionIds[link.union];
      const personId = ids.get(link.child);
      if (unionId === undefined || personId === undefined) {
        throw new Error(`seed data error: child link ${link.child} → union #${link.union}`);
      }
      const have = await tx`
        SELECT 1 FROM children WHERE union_id = ${unionId} AND person_id = ${personId}
      `;
      if (have.length) continue;
      await tx`INSERT INTO children (union_id, person_id) VALUES (${unionId}, ${personId})`;
      inserted.insertedChildLinks++;
    }
  });

  const total = await sql`SELECT count(*)::int AS n FROM people WHERE cluster = ${LISSANOURE_CLUSTER}`;
  const names = lissanourePeople().map((p) => p.fullName);
  const strayRows = await sql`
    SELECT full_name, cluster FROM people
    WHERE cluster <> ${LISSANOURE_CLUSTER} AND full_name IN ${sql(names)}
  `;

  return {
    cluster: LISSANOURE_CLUSTER,
    ...inserted,
    peopleInCluster: Number(total[0].n),
    strays: strayRows.map((r) => `${String(r.full_name)} (${String(r.cluster)})`),
  };
}
