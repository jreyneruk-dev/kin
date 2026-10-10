/**
 * Seeds the junction checklist (src/lib/checklist-data.ts) into the database
 * named by DATABASE_URL.
 *   npm run seed:checklist
 *
 * Idempotent: rows are matched on their stable key, so re-running refreshes
 * the record wording and never touches a status or a note someone wrote.
 */

import "./lib-env.ts";
import postgres from "postgres";
import { seedJunctionChecklist } from "../src/lib/seed-checklist.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

try {
  const report = await seedJunctionChecklist(sql);
  console.log(
    `checklist: +${report.inserted} new, ${report.refreshed} refreshed, ${report.total} records open`,
  );
  const sections = await sql`
    SELECT section, count(*)::int AS n FROM checklist_items GROUP BY section
  `;
  for (const row of sections) console.log(`  ${String(row.section).padEnd(18)} ${row.n}`);
} finally {
  await sql.end();
}
