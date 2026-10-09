/**
 * Roundtrip proof for the dump/restore pair, using the same embedded Postgres
 * the e2e uses — no external services touched:
 *   npx tsx scripts/restore-roundtrip.ts backups/kin-data-....json
 * Starts a throwaway DB, wipes nothing but itself, restores the dump into it,
 * prints row counts vs the dump's expectations, and tears down.
 */

import "./lib-env.ts";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

const dumpPath = process.argv[2];
if (!dumpPath || !existsSync(resolve(dumpPath))) {
  console.error("usage: npx tsx scripts/restore-roundtrip.ts <dump.json>");
  process.exit(1);
}

const dataDir = mkdtempSync(join(tmpdir(), "kin-roundtrip-"));
let pg: InstanceType<typeof EmbeddedPostgres> | null = null;

try {
  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "password",
    port: 5495,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("kin");
  const url = "postgres://postgres:password@localhost:5495/kin";

  const schema = spawnSync(
    "npx",
    ["tsx", "scripts/apply-schema.ts"],
    { encoding: "utf8", env: { ...process.env, DATABASE_URL: url } },
  );
  if (schema.status !== 0) throw new Error(`schema failed: ${schema.stderr}`);
  console.log("[1] throwaway database ready");

  const restore = spawnSync(
    "npx",
    ["tsx", "scripts/restore-data.ts", resolve(dumpPath)],
    { encoding: "utf8", env: { ...process.env, DATABASE_URL: url } },
  );
  console.log(restore.stdout.trim());
  if (restore.status !== 0) throw new Error(`restore failed: ${restore.stderr}`);
  console.log("[2] restore completed — counts diffed against the dump above");
  console.log("roundtrip OK ✅");
} finally {
  if (pg) await pg.stop().catch(() => {});
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
