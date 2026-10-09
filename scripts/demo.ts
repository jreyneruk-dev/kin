/**
 * Ephemeral local demo: embedded Postgres + seeded tree + production server.
 * Nothing persists — perfect for trying the site without Supabase.
 *
 *   npm run demo
 *
 * Join at http://localhost:3300/join?code=demo-demo (any email, password 8+).
 * Join with OWNER_EMAIL (from .env.local, default john@example.com) to get the
 * owner role and the /invites page.
 */

import "./lib-env.ts";
import { spawn, spawnSync, execSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

const PG_PORT = 5498;
const APP_PORT = Number(process.env.DEMO_PORT || 3300);
const dataDir = mkdtempSync(join(tmpdir(), "kin-demo-"));

let app: ChildProcess | null = null;
let pg: InstanceType<typeof EmbeddedPostgres> | null = null;

async function main() {
  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "password",
    port: PG_PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("kin");
  process.env.DATABASE_URL = `postgres://postgres:password@localhost:${PG_PORT}/kin`;
  if (!process.env.OWNER_EMAIL) process.env.OWNER_EMAIL = "john@example.com";
  console.log(`demo: embedded Postgres on :${PG_PORT}`);

  const schema = spawnSync("npx", ["tsx", "scripts/apply-schema.ts"], { encoding: "utf8" });
  if (!schema.stdout.includes("Applied")) {
    console.error(schema.stderr);
    process.exit(1);
  }
  const seed = spawnSync("npx", ["tsx", "scripts/seed.ts"], { encoding: "utf8" });
  if (!seed.stdout.includes("done.")) {
    console.error(seed.stderr);
    process.exit(1);
  }
  // A ready-made invite so the first visitor can join immediately.
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  await sql`INSERT INTO invites (code, note, created_by, created_at) VALUES (${"demo-demo"}, ${"demo invite"}, ${"demo"}, ${Date.now()})`;
  await sql.end();
  console.log("demo: schema + seed + demo invite ready");

  try {
    execSync(`lsof -ti tcp:${APP_PORT} | xargs kill -9`, { stdio: "ignore" });
  } catch {
    // port already free
  }
  app = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(APP_PORT)], {
    env: process.env,
    stdio: ["ignore", "ignore", "pipe"],
  });
  app.stderr?.on("data", (d) => process.stderr.write(d));

  const url = `http://localhost:${APP_PORT}`;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await fetch(url).then((r) => r.ok).catch(() => false)) break;
  }
  console.log(`demo: serving on ${url}`);
  console.log(`demo: join at ${url}/join?code=demo-demo (password 8+ chars)`);
  console.log("demo: press Ctrl+C to stop — everything is ephemeral");
  app.stdout?.on("data", () => {});
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});

process.on("SIGINT", () => shutdown());
// Ignore SIGHUP/SIGTERM: when launched detached (nohup) the parent shell's
// cleanup must not tear the demo down; stop it with Ctrl+C or SIGINT.
process.on("SIGHUP", () => {});
process.on("SIGTERM", () => {});

function shutdown() {
  console.log("\ndemo: shutting down");
  if (app) app.kill();
  if (pg) void pg.stop().catch(() => {});
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
  process.exit(0);
}
