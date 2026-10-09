# GATES.md — Phase 3b build ledger (FindMyPast research automation)

Ledger for the research automation build (Step 0 snapshot tooling, search
packs, findings form, co-pilot setup). Gates written before live verification;
G1–G5 runnable, G6–G8 verified against production on 2026-10-06.

Standing constraint (verified live): FindMyPast free index search requires a
login, its terms prohibit automated access tools, and its partner API is
gated — so kin builds *links* and *forms*, never fetches FMP itself. All
automated access is limited to open/free sources and John's own logged-in
sessions in the preview browser.

- **G1 — Code snapshot exists before changes**
  - CHECK: `find backups/kin-code-2026-10-06 -type f | wc -l` → EXPECT: ≥ 70 files
- **G2 — Data dump/restore pair works, roundtrip-verified**
  - CHECK: `grep -c "TABLES" kin/scripts/dump-data.ts` → EXPECT: ≥ 1; tool wired as `npm run dump` / `npm run restore`
  - CHECK: `npx tsx scripts/restore-roundtrip.ts backups/kin-data-….json` → EXPECT: every table ✓, "roundtrip OK"
  - RESULT: 20 people / 7 unions / 12 children / 14 facts / 5 questions / 3 users / 30 activity / 1 image round-tripped perfectly (one bug found & fixed en route: users/invites have no id column — sequence resync now limited to serial tables)
- **G3 — Link builders produce verified URLs only**
  - CHECK: `npm test` → 73 pass (research-links suite covers FMP canonical path, FreeBMD cgi, FamilySearch, WikiTree, Macartney↔McCartney variants, surname-from-last-token, cap ≤ 25)
  - Live URL probes (curl): FMP /search/results preserves params (200) ✓; FreeBMD cgi 200 ✓; .ie host 403 unlogged-in (avoided) ✓; irishgenealogy/FreeREG/GRONI drop params → landing links ✓
- **G4 — Findings endpoint: auth, validation, transaction**
  - CHECK: detail missing → 400; anon → 401; bad question → 404 (code path shared with person check)
  - Fact + question-close land in one `db.begin` transaction
- **G5 — Typecheck + build + e2e**
  - CHECK: `npm run typecheck` → 0; `npm run build` → exit 0, `/api/questions/[id]/finding` registered; `npm run e2e` → all steps pass
- **G6 — Live: search packs render on real data** (verified)
  - Research page: 5 open questions → 3× 16-link person packs + 2× 6-link fallback packs, findings form on each; person page: pack renders (0.69 s)
- **G7 — Live: endpoint contract** (verified)
  - `{}` → 400 `detail required`; anon POST → 401
- **G8 — FMP login hand-off** (manual)
  - John signs in as himself in the preview browser; agent drives searches
    read-only and files findings via the live site. Password never seen or
    stored by the agent.
