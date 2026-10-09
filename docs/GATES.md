# GATES.md — Phase 1 build ledger (authored before implementation)

Acceptance ledger for the Phase 1 build (better data entry: sourced facts,
conflict grouping, name aliases, completeness stats, edit notes). Gates were
written before any code. G6 and G7 are manual gates; the rest are runnable.

- **G1 — Roadmap exists with phases, ideas and work-saved lines**
  - CHECK: `grep -c "^## Phase" kin/docs/ROADMAP.md` → EXPECT: ≥ 4
  - CHECK: `grep -c "^### Idea" kin/docs/ROADMAP.md` → EXPECT: ≥ 5
  - CHECK: `grep -c "Work saved:" kin/docs/ROADMAP.md` → EXPECT: ≥ 12
- **G2 — Schema migration adds the new fields**
  - CHECK: `grep -c "ADD COLUMN IF NOT EXISTS" kin/src/lib/schema.sql` → EXPECT: ≥ 3
  - CHECK: `npm run schema` (with live DATABASE_URL) → EXPECT: exit 0, prints "Applied schema.sql"
- **G3 — Typecheck clean**
  - CHECK: `npm run typecheck` → EXPECT: exit 0
- **G4 — Unit tests pass (15 existing + new helpers tests)**
  - CHECK: `npm test` → EXPECT: all pass, total > 15
- **G5 — Production build succeeds**
  - CHECK: `npm run build` → EXPECT: exit 0, route table printed
- **G6 — Live site serves the new fields (manual)**
  - Apply schema to Supabase, deploy, add a fact with a source URL and the
    "searched, nothing found" kind via the live API, and see it rendered on
    the person page with its source link.
- **G7 — michael's invite wording approved (manual — John)**
  - Draft appears in the final report; John edits/approves before sending.
