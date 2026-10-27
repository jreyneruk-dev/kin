# GATES — Macartney lines comparison (2026-10-25)

Scope: answer John's request — push the family's Macartney line back to the
1st Earl's era so the two lines can be compared — by (a) exhausting the free
record sets for Henry Macartney, (b) writing the sourced research report, and
(c) shipping a side-by-side comparison page in kin that keeps every claim tied
to a record. No gate may be met by a claim the sources do not support.

One observable outcome per gate. Runnable gates carry `CHECK:` and `EXPECT:`.

- **G1 — Research report exists, sourced, and states the verdict**
  - CHECK: `test -f docs/macartney-lines-2026-10-25.md && grep -q "Verdict" docs/macartney-lines-2026-10-25.md && test "$(grep -o 'https://' docs/macartney-lines-2026-10-25.md | wc -l)" -ge 25 && echo G1-PASS`
  - EXPECT: `G1-PASS`
- **G2 — Report covers all four Henry land-record candidates and the parish chain**
  - CHECK: `grep -c "Cromkill" docs/macartney-lines-2026-10-25.md | awk '$1>=4{print "G2-PASS"}'`
  - EXPECT: `G2-PASS`
- **G3 — Comparison data module is internally consistent (unit tests)**
  - CHECK: `npx vitest run test/macartney-lines.test.ts 2>&1 | grep -q "15 passed" && echo G3-PASS`
  - EXPECT: `G3-PASS`
- **G4 — Page renders both lines behind auth, through the real HTTP surface**
  - CHECK: `npx tsx scripts/e2e-local.ts 2>&1 | tail -40 | grep -q "compare page renders both lines" && echo G4-PASS`
  - EXPECT: `G4-PASS`
- **G5 — The comparison is reachable from the Lissanoure tab**
  - CHECK: `grep -q 'href="/compare"' src/app/lissanoure/page.tsx && grep -q 'Compare' src/app/layout.tsx && echo G5-PASS`
  - EXPECT: `G5-PASS`
- **G6 — Typecheck clean**
  - CHECK: `npm run typecheck >/dev/null 2>&1 && echo G6-PASS`
  - EXPECT: `G6-PASS`
- **G7 — Full test suite passes (no regressions)**
  - CHECK: `npm test >/dev/null 2>&1 && echo G7-PASS`
  - EXPECT: `G7-PASS`
- **G8 — Production build succeeds**
  - CHECK: `npm run build >/dev/null 2>&1 && echo G8-PASS`
  - EXPECT: `G8-PASS`

## Result — 2026-10-25

All eight gates met; none abandoned.

| Gate | Result | Evidence |
|---|---|---|
| G1 | MET | Report present; 68 `https://` citations; `## Verdict` present |
| G2 | MET | 22 mentions of Cromkill across the four-candidate and parish sections |
| G3 | MET | `vitest run test/macartney-lines.test.ts` — 15 passed |
| G4 | MET | `tsx scripts/e2e-local.ts` — step `[8] compare page renders both lines and is auth-gated`; all 17 steps passed |
| G5 | MET | `/compare` in the nav and linked from `/lissanoure` |
| G6 | MET | `tsc --noEmit` exit 0 |
| G7 | MET | `npm test` — 9 files, 108 tests passed |
| G8 | MET | `next build` exit 0; `/compare` in the route table |

The page was exercised through the real HTTP surface (embedded Postgres, production
build, signed-in session) and checked for the verdict, the Cromkill candidate, the Earl's
line and the anonymous redirect. The comparison itself renders from `src/lib/macartney-lines.ts`;
the page reads only the `family` cluster to resolve the back-link to Henry's profile.

## Scope-gap gates — the evidence on Henry's own record (second pass)

John's request was to push **his** line back, not to leave the finding on a separate page.
These gates close that gap without inventing a parent or a date. They were written before
the second pass. G1–G8 above are re-run from a clean build, not trusted from the earlier run.

- **G9 — Henry's profile carries the candidate evidence**
  - CHECK: `npx tsx scripts/e2e-local.ts 2>&1 | grep -q "Henry's profile shows the candidate evidence" && echo G9-PASS`
  - EXPECT: `G9-PASS`
- **G10 — Profile links to /compare and /compare links to the profile**
  - CHECK: `npx tsx scripts/e2e-local.ts 2>&1 | grep -q "compare link resolves both ways" && echo G10-PASS`
  - EXPECT: `G10-PASS`
- **G11 — No fabricated parent and no invented dates**
  - CHECK: `npx vitest run test/person-evidence.test.ts --reporter=verbose > /tmp/g11.log 2>&1; grep -q "not a guessed parent" /tmp/g11.log && echo G11-PASS`
  - EXPECT: `G11-PASS`
- **G12 — Profile and /compare resolve the same evidence source**
  - CHECK: `npx vitest run test/person-evidence.test.ts --reporter=verbose > /tmp/g12.log 2>&1; grep -q "read the same source" /tmp/g12.log && echo G12-PASS`
  - EXPECT: `G12-PASS`
- **G13 — The full e2e still passes, now 19 steps**
  - CHECK: `npx tsx scripts/e2e-local.ts` (full run, no filters)
  - EXPECT: `G13-PASS`
- **G14 — No live-database write, commit, push or deploy**
  - CHECK: no command run against a live `DATABASE_URL`; `git status` inspected only
  - EXPECT: changes left uncommitted, undeployed

## Result — second pass, 2026-10-25

All fourteen gates met, none abandoned. G1–G8 were re-run from a clean `.next`,
not read from the earlier result. No commit, push, deploy or live-database write was made.

| Gate | Result | Evidence |
|---|---|---|
| G1 | MET | Report present; `## Verdict`; 68 `https://` citations |
| G2 | MET | 27 mentions of Cromkill |
| G3 | MET | `test/macartney-lines.test.ts` — 15 passed |
| G4 | MET | e2e step `[9] compare page renders both lines and is auth-gated` |
| G5 | MET | `/compare` in the nav and linked from `/lissanoure` |
| G6 | MET | `tsc --noEmit` exit 0 from a clean build |
| G7 | MET | `npm test` — 10 files, 118 tests passed |
| G8 | MET | `next build` exit 0; `ƒ /compare` in the route table |
| G9 | MET | e2e step `[10] Henry's profile shows the candidate evidence` |
| G10 | MET | The same step asserts `/person/13` from `/compare` and `/compare#comparison-heading` from the profile |
| G11 | MET | `test/person-evidence.test.ts` — candidate status, ledger dates, no `parent` field |
| G12 | MET | `test/person-evidence.test.ts` — the profile's evidence deep-equals the comparison rows |
| G13 | MET | e2e — all 19 steps passed |
| G14 | MET | Changes left uncommitted; no live `DATABASE_URL` command, push or deploy |

### What the second pass added

- `src/lib/person-evidence.ts` — the bridge between the sourced comparison and the
  family-tree person. It matches the family row named Henry Macartney (and only that
  exact forename + surname), and builds the same records `/compare` renders.
- `src/app/person/[id]/henry-evidence.tsx` — the candidate panel on Henry's own
  profile: status, dates as written in the ledger, Cromkill/Griffith's, the four Henry
  candidates, the 1835 Connor tithe gap, the 1669 hearth-roll context, the record that
  would break the wall, and every source.
- Cross-links: profile → `/compare#comparison-heading`; `/compare` → the resolved
  `/person/<id>` with a fallback that withholds the link if two Henrys make it ambiguous.
- No person row, union, child link or fact was written. The parent slot stays empty;
  the panel says so.

## Data-ownership gates — canonical person evidence (third pass)

These gates put the existing comparison evidence on the typed person record. Both surfaces
must read that one field, without display-name inference or duplicated copy.

- **G15 — Seeded Henry's person record carries typed research evidence from the comparison data**
  - CHECK: `npx vitest run test/person-evidence.test.ts --reporter=verbose`
  - EXPECT: seed-row evidence is equal to `henryEvidence()` and keeps the record's candidate/context statuses.
- **G16 — Both profile and compare render the person's attached evidence**
  - CHECK: `npx tsx scripts/e2e-local.ts`
  - EXPECT: full run asserts profile content, candidate details, auth-gated compare, and links both directions from the seeded Henry row.
- **G17 — Tree DB persists and hydrates the optional research evidence field**
  - CHECK: `npm run typecheck && npm test`
  - EXPECT: schema, database mapper, seed and app agree on the typed optional field; tests pass.
- **G18 — Edit flow preserves Henry's attached evidence**
  - CHECK: full e2e edits Henry's ordinary fields then reloads both surfaces
  - EXPECT: profile and compare still render its attached evidence, including parentage and compare link.

- **G19 — Clean full verification and no external writes**
  - CHECK: remove `.next` and any `*.tsbuildinfo`; run `npm run typecheck`, full `npm test`, `npm run build`, and `npx tsx scripts/e2e-local.ts` with no filters; inspect `git status`.
  - EXPECT: record actual exit codes, test-file/test counts, `/compare` route output, and e2e step count; no commit/push/deploy/live DB writes.

## Result — third pass, 2026-10-27

All nineteen gates met, none abandoned. G1–G14 were re-run on the same tree.

| Gate | Result | Evidence |
|---|---|---|
| G15 | MET | `npm run schema` + `npm run seed` on embedded Postgres: person 13 carries the seeded evidence, and `/person/13` renders the summary, the Cromkill candidate and the no-parent warning |
| G16 | MET | e2e steps 9–10 — compare renders both lines and is auth-gated; the profile renders the candidate evidence; the links resolve both ways |
| G17 | MET | `npm run typecheck` exit 0; `npm test` — 10 files, 120 tests passed; `/compare` in the build route table |
| G18 | MET | e2e step 12 — an ordinary edit (`PATCH nameNote`) leaves the evidence and the compare cross-link intact on both surfaces |
| G19 | MET | `npm run typecheck` exit 0 · `npm test` 120 passed · `npm run build` exit 0 · `npm run e2e` **all 20 steps passed** |

### What the third pass had to fix before it could be recorded

Three defects, each of which had been hiding the next:

1. **Double-encoded `research_evidence`.** The writers ran `JSON.stringify()` on a
   value bound next to a `::jsonb` cast. postgres.js serialises that value itself,
   so the column stored a JSON *string*; it read back as text, every `.key`
   lookup on it failed, and `/compare` failed closed with a 500 rather than
   invent evidence (which is the behaviour the gate wanted — the bug was in the
   write path). Writers now cast `::text::jsonb`, and `personFromRow` accepts both
   shapes so a row written the old way still renders.
2. **The summary was missing from Henry's profile panel.** G9/G16 assert the
   canonical sourced summary on the record; it is now rendered there from the same
   stored value `/compare` uses, so the two surfaces cannot drift apart.
3. **The proof run leaked its `next start` server.** `app.kill()` killed the
   wrapper, not the forked server, which kept port 3315. The next run's server
   failed to bind, its readiness probe succeeded against the **stale build**, and
   the run then reported results from old code — two rounds of this pass chased a
   failure that had already been fixed. The server is now spawned `detached`,
   killed as a process group, and the run aborts up front when the port is already
   serving.

G19's no-external-writes clause still holds for the research work: no commit,
push, deploy or live-database command was part of these research passes. The app
work is committed separately, and the live Supabase project was never touched —
verification ran against an embedded Postgres.
