# GATES.md — Phase 3a build ledger (images on person pages)

Acceptance ledger for the images build (gallery + uploads on each person's
details page: certificates, registry screengrabs, photos). Gates were written
before live verification; G1–G5 are runnable, G6–G8 were verified against
production on 2026-10-06.

Design decision (recorded deliberately): blobs live in Postgres (`images` =
metadata, `image_blobs` = bytes), not Supabase Storage. One auth model, one
backup path, no extra credentials; the split table makes a later Storage
migration a one-table change. Uploads are downscaled in the browser (max
1600px, ~≤1.5 MB) so they sit far under Vercel's ~4.5 MB request-body limit;
the server cap is 4 MB.

- **G1 — Schema migration adds the image tables (idempotent)**
  - CHECK: `grep -c "CREATE TABLE IF NOT EXISTS images" kin/src/lib/schema.sql` → EXPECT: 1
  - CHECK: `grep -c "CREATE TABLE IF NOT EXISTS image_blobs" kin/src/lib/schema.sql` → EXPECT: 1
  - CHECK: `npm run schema` against live DATABASE_URL → EXPECT: exit 0, "Applied schema.sql"
- **G2 — Typecheck clean**
  - CHECK: `npm run typecheck` → EXPECT: exit 0
- **G3 — Unit tests pass, including the sniff-only mime contract**
  - CHECK: `npm test` → EXPECT: 56 pass (was 47; +9 image tests)
  - KEY CASE: a PDF renamed to `.png` with declared type `image/png` must be
    rejected (magic bytes decide, declared type never trusted)
- **G4 — Production build registers both new routes**
  - CHECK: `npm run build` → EXPECT: `/api/people/[id]/images` and `/api/images/[id]` in route table
- **G5 — Local e2e roundtrip on the real HTTP surface**
  - CHECK: `npm run e2e` → EXPECT: step "image upload → serve → delete
    roundtrip (incl. 401 for anon)" passes; served bytes byte-identical to
    uploaded; 404 after delete
- **G6 — Live: auth gates (manual, verified)**
  - GET/POST `/api/images/…` and `/api/people/1/images` without a session → 401
- **G7 — Live: upload → serve → delete roundtrip (manual, verified)**
  - Real PNG: upload 200 → GET 200 `image/png`, bytes identical → caption
    renders on `/person/1` → DELETE 200 → GET 404. Page stayed fast (0.5 s,
    now 7 parallel queries)
- **G8 — Live: hostile upload rejected (manual, verified)**
  - PDF bytes declared as `image/png` → 415, nothing stored. (First deploy
    FAILED this gate — the declared-type fallback stored it; fixed to
    sniff-only, redeployed, re-verified. Probe rows deleted; activity log
    keeps the honest trail.)
