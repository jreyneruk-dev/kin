/**
 * Creates an invite code from the CLI:
 *   DATABASE_URL=... npm run invite -- --note "for michael"
 */

import { newInviteCode, normalizeEmail } from "../src/lib/auth.ts";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const noteIdx = process.argv.indexOf("--note");
const note = noteIdx !== -1 ? (process.argv[noteIdx + 1] ?? "") : "";
const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL ?? "owner");
const code = newInviteCode();

const sql = postgres(url, { prepare: false, max: 1 });
try {
  await sql`INSERT INTO invites (code, note, created_by, created_at) VALUES (${code}, ${note}, ${ownerEmail}, ${Date.now()})`;
  console.log(`Invite code: ${code}`);
  console.log(`Join link:   /join?code=${code}`);
} finally {
  await sql.end();
}
