# kin roadmap — usability and data quality first

Built from a review of how small families actually run shared trees
(r/Genealogy, r/selfhosted and r/familysearch threads, WikiTree's sourcing
standards, FamilySearch collaboration guides, Gramps Web import design,
GEDCOM 7 interop notes, privacy guidance for living people, digitisation
guides). Principle throughout: **minimise the work for John, michael and
every future relative** — no re-typing, no "where is this from?" emails, no
data trapped in one person's head or laptop.

## Phase 0 — done ✅ (deploy + real logins)
Supabase (Sydney) + Vercel deployment, invite-gated scrypt auth, seeded tree,
API-role lockdown, 6-hourly keepalive. Work saved: everyone — the site never
sleeps and michael never hits a dead link.

## Phase 1 — better data entry (this build)
Work saved: michael cites a source once instead of answering emails; John
stops arbitrating duplicate people because conflicts are visible, not
stacked; spelling variants stop hiding people from search; everyone sees
what to research next without a family meeting.

1. **Sourced facts, properly typed** — every fact gains a source *URL* and a
   source *type* (primary record, secondary, family lore, or "searched,
   nothing found"). A badly formatted citation is light-years ahead of none
   (WikiTree), so the form invites paste-a-link rather than demanding
   perfection. Work saved: michael's research lands verifiable the first time.
2. **Fact grouping + conflict visibility** — facts render grouped by kind
   (Birth: …, Death: …) and a conflict badge marks kinds holding 2+ entries,
   so two competing birth dates invite a comment instead of silently
   coexisting (FamilySearch etiquette: explain, don't overwrite). Work saved:
   John stops being the referee; the disagreement is on the page.
3. **Name aliases** — people gain an alias list (e.g. Eileen McCartney ↔
   Macartney); search and the tree label use them. Work saved: nobody
   re-searches the "other" spelling and concludes the person is missing.
4. **Completeness at a glance** — the people index shows what each record is
   missing (birth/death/place, like today) plus a sourced-facts count so
   unsourced lines are visible. Work saved: the research to-do list writes
   itself; no meeting required.
5. **Edit notes everywhere** — fact-adds accept an optional "what changed?"
   note into the activity log (person edits already do). Work saved: the
   activity feed explains *why*, not just *what* — fewer repeat questions.

## Phase 2 — bring michael's tree in (next)
Work saved: michael exports once from Ancestry (~5 minutes) instead of
retyping his tree; John reviews a preview instead of hand-copying for hours;
the family's data becomes un-trappable.

1. **GEDCOM import** (owner-only): upload `.ged` → parse → preview counts and
   fuzzy duplicate list (normalised name + birth year ±2 → skip/merge) →
   confirmed import with per-person "GEDCOM import" notes for anything
   unmapped (Gramps Web's preserve-don't-drop rule). Work saved: michael's
   years of Ancestry research arrive in one file — nobody retypes anything.
2. **GEDCOM export / backup button** — the inverse trip. Work saved: whatever
   happens to kin, Supabase or Vercel, the family's work always walks out in
   a standard file.

## Phase 3 — family contributions
Work saved: relatives upload photos directly instead of emailing them to John
to place; memories are captured verbatim in one paste; living relatives'
exact data is protected by default (Ancestry/FamilySearch practice).

1. **Photo & document upload** on people and facts (Supabase Storage, free
   1 GB, originals kept per National Archives guidance). Work saved: michael
   becomes a direct contributor, not an attachment forwarder.
   *Shipped 2026-10 (people-level): gallery + uploads on every profile, blobs
   in Postgres (`images`/`image_blobs`) with in-browser downscaling — one auth
   model, one backup path; migrate `image_blobs` to Storage if usage grows.
   Remaining: attach images to individual facts.*
2. **Story / biography section** on profiles — narrative where `notes` today
   is a data field. Work saved: grandma's story is pasted once, in her words,
   not paraphrased into dates by someone else.
3. **Living-person softening** — exact birth dates/places of living people
   hidden from non-owner members (the LIVING badge stays). Work saved:
   relatives can share the link further without a privacy lecture.
   *Shipped 2026-10: the **Alive tick box** (Phase 3c) now powers the tree's
   privacy posture — every person defaults to Alive, goes clear automatically
   when a death is recorded, and can be unticked by hand while death is still
   unknown; the people index no longer flags `death?` on anyone marked Alive.*

## Phase 3b — FindMyPast research automation (shipped 2026-10)
Work saved: the family finds records through pre-built, alias-aware search
links instead of re-learning each site's search forms; findings land as
sourced facts in one step instead of via email.

1. **Snapshot tooling** — `npm run dump` writes a full JSON snapshot of every
   table (blobs base64-encoded) before risky changes; `npm run restore`
   reloads it (empty DB by default, `--replace` for crisis wipe);
   `scripts/restore-roundtrip.ts` proves the pair against an embedded
   Postgres. Pre-change snapshots live in `../backups/`.
2. **Search packs** — every open question (and each person page's question
   section) carries deep links to FindMyPast, FreeBMD, FamilySearch and
   WikiTree across all surname variants (Macartney ↔ McCartney ↔ "Mac
   cartney"), plus landing links to GRONI, irishgenealogy.ie and FreeREG —
   which drop URL params, so they stay one form-fill instead of pretending to
   deep-link. Every URL format verified against the live sites first.
3. **Findings form** — "I found something" on a question files a sourced fact
   (detail, source, link, primary/secondary/lore/negative) and optionally
   closes the question, fact + state in one transaction.
4. **Co-pilot sessions** — John logs into FindMyPast himself in the preview
   browser (agent never handles the password); the agent drives searches one
   question at a time at human speed, respecting FMP's fair-usage caps and
   its prohibition of automated access tools.

## Phase 3c — Alive tick box (shipped 2026-10)
Work saved: nobody has to remember to mark someone as dead — the tree stays
honest by default, and "death?" clutter disappears from the people index.
See docs/GATES-phase3c-alive.md for the behaviour contract and proof.

## Phase 4 — research accelerators (later)
Work saved: turns the research hub from a static list into an assistant.

1. **"Ask AI" panel** over open questions + recorded sources (the beebots
   AI-gateway pattern), suggesting record sets per missing field.
2. **Per-person timeline view** of facts + comments.
3. **DNA-match notes field** for when the family does tests.

## Brainstorm ledger (spec-brainstorm — five ways kin could be better)

### Idea 1 — GEDCOM import: michael's tree arrives instead of being retyped
A demanding user would notice their cousin's research simply appearing in the
tree. Cost: ~1–2 sessions (parser, preview/dedupe, tests). **Top two by
value-for-cost: this and Idea 2** — both convert michael from a data source
John must transcribe into a direct contributor.

### Idea 2 — One-drag photo & document upload per person/fact
A demanding user would notice relatives engaging with pictures, not date
lists. Cost: ~1 session (Supabase Storage + thumbnails later).

### Idea 3 — Structured sources with conflict grouping
Citations land right the first time; disagreements show side-by-side. Cost:
~half a session — which is why it shipped first, in Phase 1.

### Idea 4 — Name aliases (Macartney/McCartney)
Search finds both spellings; the family's own open question stops costing
searches. Cost: ~2 hours — shipped in Phase 1.

### Idea 5 — Story field + completeness meter + GEDCOM export
Narrative captures memory verbatim; the meter shows gaps without meetings;
export guarantees nothing is ever trapped. Cost: ~half a session each —
meter and story notes shipped in Phase 1, export lands with Phase 2.

### Idea 6 — "Ask AI" research assistant over the family's own open questions
A demanding user would notice the site suggesting *where to look next* per
missing field. Cost: ~1 session once Phases 1–3 have fed it data. Parked for
Phase 4 on purpose: assistants are only as good as the recorded sources
under them.

Work saved (tally across items): 12+ distinct "who stops doing what"
statements — the roadmap's unit of value.
