/**
 * Applies src/lib/schema.sql to the database named by DATABASE_URL.
 *   npm run schema
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
const ddl = readFileSync(join(import.meta.dirname, "../src/lib/schema.sql"), "utf8");

try {
  await sql.unsafe(ddl);
  console.log("Applied schema.sql");
} finally {
  await sql.end();
}
