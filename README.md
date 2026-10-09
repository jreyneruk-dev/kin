# Kin — a private, collaborative family tree

[![CI](https://github.com/jreyneruk-dev/kin/actions/workflows/ci.yml/badge.svg)](https://github.com/jreyneruk-dev/kin/actions/workflows/ci.yml)

A login-only website for the **Macartney / Davies / Fahey** family to build one
shared tree together. Seeded from michael's Ancestry research: the six children
of William H Macartney & Edith Maude Grainger, including Kathleen S Macartney
(John's maternal grandmother).

- **Private by default** — nothing renders without signing in; no public pages,
  no analytics. `noindex` site-wide.
- **Click-to-grow tree** — add a parent, partner or child from any profile.
- **Collaboration** — comment on anyone (YouTube-style), raise research
  questions, add sourced facts, and watch it all in the activity log.
- **Images on every profile** — certificates, registry screengrabs and photos,
  uploaded straight from the browser (auto-downscaled), viewed full size in a
  lightbox. Stored in the database so they're private, backed up with the tree
  and survive every deploy.
- **Research hub** — curated next steps, surname backgrounds and the record
  sets that matter for *this* family, with links. Every open question now
  carries a **search pack** (pre-built FindMyPast / FreeBMD / FamilySearch /
  WikiTree deep links across all surname variants) and an "I found something"
  form that files a sourced fact in one step. FindMyPast's own terms forbid
  automated access, so the site links to searches and lets humans do the
  judging — kin never scrapes it.
- **Backup tooling** — `npm run dump` snapshots every database table to JSON
  and `npm run restore` reloads it (with `--replace` as the crisis switch); a
  roundtrip script proves the pair. Pre-change snapshots live in `../backups/`.
- **Invite-only membership** — the owner creates codes; each code joins one
  person. michael and your sister pick their own passwords on arrival.

## Pages

| Route | What it is |
|---|---|
| `/` | The tree, laid out by generation, with a branch filter, open questions and recent activity |
| `/person/[id]` | Profile: facts & sources, image gallery, comments, questions, family links, add-a-relative |
| `/people` | Searchable index with "missing details" flags (each flag = a research to-do) |
| `/lissanoure` | The research line's own tab: the documented Macartneys of Lissanoure, drawn from the `lissanoure` cluster alone (see Research clusters below) |
| `/research` | Curated hub: gaps to fill first, surname notes, record sets, all questions |
| `/activity` | Full change log |
| `/invites` | Owner-only: create and track invite codes |
| `/login`, `/join` | Sign in; join with an invite code |

## Run locally

```bash
cd kin
npm install
cp .env.example .env.local        # then edit DATABASE_URL + OWNER_EMAIL
npm run schema                    # create tables
npm run seed                      # load the transcribed tree + starter questions
npm run dev                       # http://localhost:3300
```

Then create yourself an invite and join:

```bash
npm run invite -- --note "john"
# open http://localhost:3300/join?code=<the code>
```

Sign in with your email + the password you chose at join. `OWNER_EMAIL` (in
`.env.local`) makes that address the owner, which unlocks `/invites`.

## Tests & proof

```bash
npm test          # 93 vitest tests: tree layout, auth, facts, GEDCOM, images, cluster isolation
npm run typecheck
npm run e2e       # embedded Postgres + real HTTP: join→tree→profile→comment→fact→image→question→invite→logout
```

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `npm ci`,
`npm run typecheck` and `npm test` on every pull request and on every push to
`main`; the badge above is its current state. If a pull request shows no
checks, GitHub dropped the run rather than the repo skipping it — re-run from
the Actions tab and don't merge blind.

## Deploy (free tier, ~10 minutes)

1. **Supabase**: create a free project at supabase.com → copy the **session
   pooler** connection string (port 5432) from Project Settings → Database.
   Use port **5432**, not the transaction pooler on 6543: Supavisor's
   transaction mode corrupts postgres.js pipelined concurrent queries, which
   makes pages hang indefinitely (this bit us in production — see the deploy
   notes below).
2. **Vercel**: `npx vercel` from this folder (or push to GitHub and import,
   root directory = `kin`). The production project is wired to
   `jreyneruk-dev/kin`, so a merge into `main` deploys itself; a manual
   `vercel --prod` still works. Set environment variables:
   - `DATABASE_URL` — the Supabase pooled string
   - `OWNER_EMAIL` — your email (you become the owner when you join with it)
3. **Apply the schema & seed** against the live database:
   ```bash
   DATABASE_URL="<pooled string>" npm run schema
   DATABASE_URL="<pooled string>" npm run seed
   ```
4. **Claim the site**: open `https://<your-app>.vercel.app/join`, create your
   first invite first (`DATABASE_URL=... npm run invite -- --note "john"`), and
   join with your `OWNER_EMAIL`.
5. **Invite the family**: on `/invites`, create a code each for michael and
   your sister, and send them the `/join?code=…` link. They choose their own
   password — no password sharing, and you can see who joined in the activity
   log.

### Import & backup (owner only, `/imports`)

- **Import**: upload a GEDCOM 5.5.1 file (michael's Ancestry tree →
  *Tree settings → Export tree*). kin parses it, shows every person it found
  with a suggested action — **merge** into an existing record (name + birth
  year heuristics, with aliases considered) or **add as new** — and writes
  nothing until you confirm the plan. Merges only fill blanks and add
  aliases; they never overwrite. Unmapped GEDCOM data is preserved as a
  per-person note, never silently dropped. Verified: re-importing kin's own
  export is a byte-identical no-op.
- **Export**: `GET /api/export` (or the button on `/imports`) downloads the
  whole tree — people, families, facts, sources — as a standard GEDCOM file.
  Keep copies; it is the family's exit valve. `?cluster=<key>` exports one
  research cluster instead (see below); the default and any unknown key are
  the family tree.

### Live deployment notes (kin-two-pi.vercel.app)

- **Database**: Supabase project `kin` (org `Kin`, Sydney, free plan). The
  session-pooler connection string (port **5432**, `prepare: false`) is set as
  `DATABASE_URL` in the Vercel project settings. We moved off the transaction
  pooler (6543) after diagnosing intermittent full-page hangs: concurrent
  queries pipelined by postgres.js never reach Postgres through Supavisor's
  transaction mode (server-side shows zero backends), wedging every request
  on that function instance. The session pooler passes the same load. Vercel
  functions also run in `syd1` (set via `vercel.json`) so they sit next to
  the database instead of 15,000 km away in `iad1`.
- **API roles locked**: kin talks straight to Postgres, so
  `scripts/lock-api-roles.mjs` revokes all grants from Supabase's `anon` and
  `authenticated` REST roles — the public REST endpoint returns
  `permission denied`. Re-run that script if you ever recreate the schema.
- **Keepalive against auto-pausing**: free Supabase projects pause after ~7
  days without activity. The launchd agent `net.reyner.kin-keepalive`
  (`~/.claude/scripts/kin-supabase-keepalive.sh`) pings the project every 6
  hours with wake-retry; log at `~/.claude/logs/kin-keepalive.log`.
- **Secrets**: the DB password and provisioning access token live in the
  git-ignored `../.freebuff/` folder.

## Editing the seed

All starting content lives in `src/lib/seed-data.ts` — people, couples,
children, and the open questions. Change it and re-run `npm run seed`
(it rebuilds tree content; users, sessions, invites and the activity log are
kept). Because that truncate is database-wide, `npm run seed` now refuses to
run while a research cluster exists unless you pass `--force`.

## Research clusters (speculative lines)

One database, several independent research lines. Every person and union
carries a `cluster`: `family` is the real Macartney / Davies / Fahey tree, and
a speculative line lives in the same tables under its own key so it can be
researched with the full toolset — facts, sources, images, comments — without
one row of it reaching the tree.

- **Rule** (`src/lib/clusters.ts`): reads take the cluster and default to
  `family`, so a read that forgets the argument can only be too narrow, never
  leak. Writes derive the cluster from the person they hang off
  (`createPersonWithLink`), and `addChild` refuses a cross-cluster link
  outright. GEDCOM export and the person page are scoped the same way.
- **Isolation is tested**: `test/cluster.test.ts` runs the production schema on
  an embedded Postgres and fails if a single research row reaches the default
  people, union or child-link feeds, or a default export.
- **First cluster**: `lissanoure` — the documented Macartneys of Lissanoure,
  Co. Antrim (George Macartney, Sheriff of co. Antrim, b.1626, down to the last
  of the name in 1943), seeded from `src/lib/seed-lissanoure-data.ts` where
  every claim carries its source. It exists to test a suspected — unproven —
  connection to the family's Dublin Macartneys. `npm run seed:lissanoure`
  (idempotent; re-running completes, never duplicates).
- **Combining later** is one deliberate step: move the connected person's
  cluster to `family`, or add the linking union — never a merge of two
  half-populated trees. No app UI writes across the boundary.

## Data model (for future tweaks)

`people` · `unions` (couples) · `children` (union↔person) · `facts` (sourced
events) · `comments` (person or union) · `questions` · `users` · `sessions` ·
`invites` · `activity`. `people` and `unions` each carry `cluster`
(default `family`). Schema: `src/lib/schema.sql`.

## Design notes

- **Stack**: Next.js 15 (App Router) + Tailwind 4 + TypeScript + postgres.js,
  following the repo's `beebots` patterns (pooled Supabase, `prepare: false`,
  literal column lists) and `bayline`'s UI conventions. No new runtime deps
  beyond `postgres`.
- **Auth**: scrypt password hashing (`node:crypto`), DB-backed session tokens
  in an HttpOnly cookie, constant-time comparisons, timing-decoy on unknown
  emails. No OAuth, no email confirmation — family-sized, invite-gated.
- **Privacy**: the site renders nothing for signed-out visitors, marks living
  people, and sets `noindex`. Still, treat it as family-trust infrastructure:
  invite people you'd share the photo album with.
- **v2 ideas** (the data model already supports them): GEDCOM import/export to
  sync with michael's Ancestry tree, photo uploads, fact-confidence voting on
  comments, and an "Ask AI" research panel wired to the open-questions list.

MIT. Built with Buffy (Freebuff).
