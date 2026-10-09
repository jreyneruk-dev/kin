/**
 * Restore a kin data dump created by scripts/dump-data.ts.
 *   npm run restore -- backups/kin-data-....json            # empty DB only
 *   npm run restore -- backups/kin-data-....json --replace  # wipe + reload
 * Refuses to touch a database that already has people unless --replace is
 * given — this is crisis recovery, not everyday merging. Everything runs in
 * ONE transaction: a failed restore leaves the target database untouched.
 */

import "./lib-env.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
type Row = Record<string, unknown>;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const fileArg = process.argv[2];
const replace = process.argv.includes("--replace");
if (!fileArg) {
  console.error("usage: npm run restore -- <dump.json> [--replace]");
  process.exit(1);
}
const filePath = resolve(fileArg);
const payload = JSON.parse(readFileSync(filePath, "utf8")) as {
  meta: { rows: Record<string, number> };
  data: Record<string, Row[]>;
};

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

const data: Record<string, Row[]> = payload.data;

// Insert order respects FKs; session/invite tables have none but keep the order.
const TABLES = [
  "users",
  "invites",
  "people",
  "unions",
  "children",
  "facts",
  "comments",
  "questions",
  "activity",
  "images",
  "image_blobs",
  "sessions",
] as const;

// Tables with a SERIAL id column — the only ones needing identity resets and
// sequence re-syncs (users/invites key on email/code; children/sessions and
// image_blobs have no generated ids at all).
const SERIAL_ID_TABLES = new Set(["people", "unions", "facts", "comments", "questions", "activity", "images"]);

function encode(value: unknown, table: string, column: string): unknown {
  // postgres.js sends Buffer for bytea as-is; everything else passes through.
  if (table === "image_blobs" && column === "data" && typeof value === "string") {
    return Buffer.from(value, "base64");
  }
  return value;
}

function normalize(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value as unknown[];
  // pg numeric/bigint may survive JSON as string — pass through as-is.
  return String(value);
}

try {
  const existing = await sql`SELECT COUNT(*)::int AS n FROM people`;
  const have = existing[0].n as number;
  if (have > 0 && !replace) {
    console.error(
      `refusing: target database already has ${have} people. Use --replace to wipe and reload (crisis recovery only).`,
    );
    process.exit(1);
  }

  const expected = payload.meta.rows as Record<string, number>;
  await sql.begin(async (tx) => {
    for (const table of [...TABLES].reverse()) {
      await tx`DELETE FROM ${tx(table)}`;
    }
    for (const table of TABLES) {
      const rows = payload.data[table] ?? [];
      // Reset identity so SERIAL ids match the dump exactly.
      if (rows.length && SERIAL_ID_TABLES.has(table)) {
        await tx`TRUNCATE ${tx(table)} RESTART IDENTITY CASCADE`;
      }
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const normalized = cols.map((c) => normalize(row[c]));
        const values: postgres.SerializableParameter[] = normalized.map((v, i) =>
          encode(v, table, cols[i]) as postgres.SerializableParameter,
        );
        await tx`INSERT INTO ${tx(table)} (${tx(cols)}) VALUES ${tx(values)}`;
      }
      // Re-sync sequence after explicit ids.
      if (rows.length && SERIAL_ID_TABLES.has(table)) {
        await tx`SELECT setval(pg_get_serial_sequence(${table}, 'id'), COALESCE((SELECT MAX(id) FROM ${tx(table)}), 1))`;
      }
    }
  });

  console.log(`restored ${filePath}`);
  let mismatches = 0;
  for (const table of TABLES) {
    const n = await sql`SELECT COUNT(*)::int AS n FROM ${sql(table)}`;
    const want = expected[table] ?? 0;
    const got = n[0].n as number;
    if (got !== want) mismatches++;
    const mark = got === want ? "✓" : `✗ (expected ${want})`;
    console.log(`${table.padEnd(12)} ${got} ${mark}`);
  }
  if (mismatches > 0) process.exit(1);
  console.log("row counts match the dump ✅");
} finally {
  await sql.end();
}
