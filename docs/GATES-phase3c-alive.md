# GATES.md — Phase 3c build ledger (Alive tick box)

Ledger for the Alive tick box (per-person alive flag, ticked by default,
clears on recorded death, hand-untick sticks while death is unknown). Gates
written before live verification; G1–G4 runnable, G5–G6 verified against
production on 2026-10-06.

Behaviour contract:
- New people default to Alive (schema default + form default).
- A recorded death — date OR place — forces the box clear; the stored flag is
  derived on every write (`deriveLiving`), so "death recorded but still shown
  alive" cannot happen through any API path.
- The family can untick by hand when death is merely unknown; that untick
  sticks (no death fields → stored living=false is respected), and re-ticking
  later also works.
- The people index never shows `death?` for someone ticked Alive — `death?`
  appears only when death is genuinely missing AND the person is not alive.

- **G1 — Derivation helper is pure and tested**
  - CHECK: `npm test` → 77 pass, alive.test.ts covers default/death-date/death-place/never-alive-with-death
- **G2 — Schema default flips to TRUE, idempotently**
  - CHECK: `npm run schema` (live) → exit 0; information_schema shows `living DEFAULT true`
- **G3 — All write paths derive**
  - POST /api/people, PATCH /api/people/[id], personFromRow (read-side defence) all call deriveLiving
- **G4 — Forms: "Alive" label, ticked default, auto-untick on death typing**
  - edit-form.tsx + add-relative.tsx; checkbox disabled (not merely hidden)
    while a death field holds text, so the UI can never show the lie
- **G5 — Build + e2e**
  - CHECK: `npm run typecheck` → 0; `npm run build` → exit 0; `npm run e2e` → all steps pass
- **G6 — Live behaviour proof (verified, probe person deleted after)**
  - create no death → living=true ✓
  - add deathDate → living=false ✓
  - death recorded + client sends living=true → still false ✓
  - death cleared + hand re-tick → living=true ✓
  - deathPlace alone → living=false ✓
  - Probe row deleted; one honest activity-log entry remains.
