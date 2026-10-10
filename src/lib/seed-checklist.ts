/**
 * Seeds the junction checklist (src/lib/checklist-data.ts).
 *
 * Idempotent by key: a re-run refreshes each record's wording and order but
 * never touches its status, note or attribution — a reading someone recorded
 * is research data, not seed content. Returns a report rather than logging so
 * the CLI prints it and the test suite asserts on it.
 */

import type postgres from "postgres";
import { junctionChecklist } from "./checklist-data";

export const CHECKLIST_SEEDED_BY = "seed:checklist";

export interface ChecklistSeedReport {
  /** Rows created by this run. */
  inserted: number;
  /** Rows whose wording this run refreshed (status/note preserved). */
  refreshed: number;
  /** Rows in the table after the run. */
  total: number;
}

export async function seedJunctionChecklist(
  sql: postgres.Sql,
): Promise<ChecklistSeedReport> {
  const records = junctionChecklist();
  const report: ChecklistSeedReport = { inserted: 0, refreshed: 0, total: 0 };

  await sql.begin(async (tx) => {
    for (const [index, record] of records.entries()) {
      const found = await tx`SELECT id FROM checklist_items WHERE key = ${record.key} LIMIT 1`;
      if (found.length) {
        await tx`
          UPDATE checklist_items SET
            section = ${record.section},
            title = ${record.title},
            detail = ${record.detail},
            url = ${record.url},
            sort_order = ${index}
          WHERE id = ${Number(found[0].id)}
        `;
        report.refreshed++;
      } else {
        await tx`
          INSERT INTO checklist_items (key, section, title, detail, url, sort_order)
          VALUES (${record.key}, ${record.section}, ${record.title}, ${record.detail}, ${record.url}, ${index})
        `;
        report.inserted++;
      }
    }
  });

  const rows = await sql`SELECT count(*)::int AS n FROM checklist_items`;
  report.total = Number(rows[0].n);
  return report;
}
