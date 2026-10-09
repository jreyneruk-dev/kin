/**
 * Logical dump of the kin database to JSON — the pre-change snapshot tool.
 *   npm run dump                          # -> backups/kin-data-<timestamp>.json
 *   npm run dump -- backups/kin-data.json # explicit path
 * Covers every table, including sessions/invites (so a restore brings a
 * working site back) and image blobs (base64). Restore with restore-data.ts.
 *
 * One pooler transaction per table so a mid-dump failure can't produce a
 * half-empty schema; the whole file is written only after every read returns.
 */

import "./lib-env.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const argPath = process.argv[2];
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outPath = resolve(argPath ?? `backups/kin-data-${stamp}.json`);

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

const TABLES = [
  "people",
  "unions",
  "children",
  "facts",
  "comments",
  "questions",
  "users",
  "sessions",
  "invites",
  "activity",
  "images",
  "image_blobs",
] as const;

type Dump = Record<string, Record<string, unknown>[]>;

const dump: Dump = {};
try {
  for (const table of TABLES) {
    dump[table] = await sql`SELECT * FROM ${sql(table)} ORDER BY 1`;
    console.log(`${table.padEnd(12)} ${dump[table].length}`);
  }

  // base64 the blobs so the dump is plain JSON end to end
  dump.image_blobs = dump.image_blobs.map((r) => ({
    image_id: r.image_id,
    data: Buffer.from(r.data as Uint8Array).toString("base64"),
  }));

  mkdirSync(dirname(outPath), { recursive: true });
  const payload = {
    meta: {
      dumpedAt: new Date().toISOString(),
      database: url.includes("localhost") ? "local" : "supabase-live",
      rows: Object.fromEntries(TABLES.map((t) => [t, dump[t].length])),
    },
    data: dump,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 1));
  console.log(`wrote ${outPath}`);
} finally {
  await sql.end();
}
