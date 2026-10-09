/**
 * Seeds the speculative Lissanoure cluster into the database named by
 * DATABASE_URL.
 *   npm run seed:lissanoure
 *
 * Writes only cluster 'lissanoure'. Idempotent: re-running completes the
 * pedigree instead of duplicating it. Exits non-zero if any seeded name turns
 * up outside the cluster — the one thing this script must never do.
 */

import "./lib-env.ts";
import postgres from "postgres";
import { seedLissanoure } from "../src/lib/seed-lissanoure.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

try {
  const report = await seedLissanoure(sql);
  console.log(
    `cluster '${report.cluster}': +${report.insertedPeople} people, ` +
      `+${report.insertedUnions} unions, +${report.insertedChildLinks} child links, ` +
      `+${report.insertedFacts} facts`,
  );
  console.log(`cluster '${report.cluster}' now holds ${report.peopleInCluster} people`);

  const totals = await sql`
    SELECT cluster, count(*)::int AS n FROM people GROUP BY cluster ORDER BY cluster
  `;
  for (const row of totals) console.log(`  ${String(row.cluster).padEnd(12)} ${row.n} people`);

  if (report.strays.length) {
    console.error(`FAILED: seeded names outside cluster '${report.cluster}': ${report.strays.join(", ")}`);
    process.exit(1);
  }
  console.log("no seeded name exists outside the cluster — family tree untouched.");
} finally {
  await sql.end();
}
