# GATES.md — Phase 2 build ledger (GEDCOM import + export)

Authored before implementation. G7 and G8 are manual gates; the rest runnable.

- **G1 — Pure GEDCOM modules exist (parser, matcher, exporter), no DB/React imports**
  - CHECK: `grep -L "from \"@/lib/db\"\|next/" kin/src/lib/gedcom.ts kin/src/lib/gedcom-export.ts | wc -l` → EXPECT: 2 (neither file imports DB or Next)
  - CHECK: `grep -c "^export function" kin/src/lib/gedcom.ts kin/src/lib/gedcom-export.ts` → EXPECT: ≥ 8 total
- **G2 — Unit tests pass, including export→parse round-trip**
  - CHECK: `npm test` → EXPECT: all pass, count > 28
- **G3 — Owner-only import/export API wired with preview → confirm flow**
  - CHECK: `grep -c "requireOwner" kin/src/app/api/import/route.ts kin/src/app/api/export/route.ts` → EXPECT: ≥ 2
- **G4 — Import UI exists (upload, preview counts, resolve duplicates, commit)**
  - CHECK: `grep -c "Confirm\|preview" kin/src/app/imports/page.tsx` → EXPECT: ≥ 3
  - CHECK: `npm run typecheck` → EXPECT: exit 0
- **G5 — Production build succeeds**
  - CHECK: `npm run build` → EXPECT: exit 0
- **G6 — Live round-trip verified (manual, then cleaned up)**
  - Deploy, export the live tree as GEDCOM, re-import the export as
    "michael-merge-test", confirm preview counts, delete the test import —
    live DB back to 12 people, no fabricated facts left behind.
- **G7 — Nav entry to /imports visible for owner only (manual)**
- **G8 — README documents the import/export flow (manual)**
