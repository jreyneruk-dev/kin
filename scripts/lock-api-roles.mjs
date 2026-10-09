// One-off hardening: kin never uses Supabase's auto-REST API (it talks straight
// to Postgres), so strip the anon/authenticated API roles of all rights. This
// makes the public REST endpoint return permission errors instead of family data.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

const tables = [
  "people", "unions", "children", "facts", "comments",
  "questions", "users", "sessions", "invites", "activity",
];

for (const t of tables) {
  await sql`REVOKE ALL ON TABLE public.${sql(t)} FROM anon`;
  await sql`REVOKE ALL ON TABLE public.${sql(t)} FROM authenticated`;
}

// Belt and braces: default for future tables too.
await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon`;
await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated`;

// Prove it: list remaining grants for the two API roles.
const left = await sql`
  SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
  WHERE grantee IN ('anon', 'authenticated')
  ORDER BY grantee, table_name
`;
console.log(left.length === 0 ? "OK: no grants left for anon/authenticated" : JSON.stringify(left, null, 2));

await sql.end();
