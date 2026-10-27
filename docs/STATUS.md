# kin — current status and handover

**Updated 2026-10-27.** This is the one file to read first, on any machine, to
know where the research stands, what has been tried, what is blocked, and what
to do next. It is a map and a worklist, not a report: the sourced reports are
the other files in this folder (see §1b).

---

## 1. Where to pick up

### 1a. The project

| | |
|---|---|
| Repo | `jreyneruk-dev/kin` (this repo) |
| App | Next.js 15 + Tailwind 4 + TypeScript + postgres.js, login-only family-tree site |
| Run | `npm install` → `cp .env.example .env.local` → `npm run schema` → `npm run seed` → `npm run dev` (port 3300) |
| Checks | `npm run typecheck`, `npm test`, `npm run e2e`, `npm run build` |
| Deploy | merge to `main` → Vercel auto-deploys; Supabase (Sydney) for the DB. Vercel project env vars: `DATABASE_URL`, `OWNER_EMAIL` |
| Live | `kin-two-pi.vercel.app` |
| Secrets | git-ignored `../.freebuff/` and the Vercel/Supabase dashboards — never in a commit |

### 1b. The research files, and which one answers what

| File | What it is |
|---|---|
| **`docs/STATUS.md`** | **This file — start here** |
| `docs/reyner-actions.md` | The Reyner line: standing action list, person-by-person status table, sections A–H (what is proven, what is not, what to fetch next) |
| `docs/macartney-lines-2026-10-25.md` | The two Macartney lines compared; verdict, search log with every source, list of what would settle it |
| `docs/macartney-plan-execution-2026-10-26.md` | What the 26 Oct plan produced: the Cromkill land evidence read from the original valuation book, the identified baptism register, and the precise list of blocked sources |
| `docs/henry-origin-2026-10-09.md` | The earlier venue sweep for Henry Macartney, and the junction verdict |
| `docs/mabel-and-parents-2026-10-07.md` | Proven parentage of William H Macartney (Richard Henry × Dora Dunne) |
| `docs/fmp-session-2026-10-06.md` | FindMyPast session notes plus the site-search mechanics that actually work |
| `docs/GATES*.md` | Acceptance ledgers for the app builds, with the evidence each gate returned |
| `src/lib/macartney-lines.ts`, `src/app/compare/` | The machine-readable comparison behind `/compare` |
| `src/lib/person-evidence.ts`, `src/app/person/[id]/henry-evidence.tsx` | The same evidence rendered on Henry's own profile |

---

## 2. The two lines — documented state

### 2a. Macartney line (paternal grandmother's side)

**Documented chain:** John David Reyner → **Kathleen S "Sheila" McCartney**
(b. 10 Apr 1907, Dublin — identity confirmed by John) → **William Henry
Macartney** (1871–after 1901) → **Richard Henry Macartney** (c.1841–1884) →
**Henry Macartney, farmer** — named as Richard's father in the 1870 St Mark's
marriage register.

**The wall is at Henry.** No record read so far places Henry anywhere, and
nothing joins him to the Lissanoure/Earl line; the Earl's family is **not**
disproved as related, merely unproved, and the estate evidence (below) points
away from it.

**Best-evidenced candidate for Henry:** **Cromkill, Connor parish, Co. Antrim**
— read from the original valuation revision book (`VAL/12/B/3/18A`, 1863–1880,
folios 52–73): six McCartney tenements, including **Henry McCartney holding a
c.27-acre farm directly of the Representatives of George Gray**, subletting two
houses and gardens. A Presbyterian McCartney farming family of the same name is
still in Cromkill in 1901 and 1911. **Candidate, not identification** — no
record names Richard there.

**The record that would break the wall:** **Connor Presbyterian baptisms
1819–1963, PRONI `MIC1P/162`** — proven by the *PRONI Guide to Church Records*
to be the **only** surviving register covering a c.1841 baptism in that parish
(the Church of Ireland register there begins in 1871). One lookup could name
Richard as Henry's son and give the townland, plus siblings.

### 2b. Reyner line (paternal surname line)

**Documented chain:** John Mervyn Reyner (b. 1932, Dublin area) → **Samuel
Arthur Reyner** (b. Jan 1884; m. **Mary Jane Evans**, 29 Nov 1911, Greystones;
passenger guard; alive Apr 1926) → **Joseph Reyner** (b. c.1860–63, Co.
Kildare; head porter → railway servant; **d. 14 Dec 1938, Dún Laoghaire**) →
**John Reyner of Co. Louth** (b. c.1841, **railway pensioner**, in Joseph's
1901 household described only as *Relative* — **father is the natural reading
and is inference, not proof**).

Proven by document: Samuel Arthur's father is Joseph (1911 marriage
certificate); Joseph's death (1938, informant his daughter Eva Constance
Phillips, 45 Glasthule Road); Sammy's death (10 Apr 1933, Richmond Hospital,
aged 12 y 7 m); Mary Jane's death (19 Jul 1946, Grangegorman); the 1901 and 1911
households.

**The gaps:** (a) Joseph's own parentage — the John of Co. Louth link is
unproven; (b) **Samuel Arthur's death is unfound** — family memory says about
1940, but the effort recorded in the files is a search of the civil index for
Co. Dublin 1930–1955 that returned nothing, so the search terms are worth
re-checking before the memory is; (c) John Mervyn's 1932 birth is not in any
free index (§4).

---

## 3. What worked — reuse these

1. **User-side browser + human/Claude reading of a register image.** The single
   most productive method in this whole project. Every decisive reading in the
   Reyner line — Samuel Arthur's 1911 marriage, Sammy's 1933 death, Mary Jane's
   1946 death, Joseph's 1938 death — came from the user opening the record in a
   browser and reading the crop, not from an agent fetch. Handwriting does not
   survive OCR or a 403.
2. **The informant column as the discriminator.** Who reported a death settles
   identity better than an age does: "Eva Constance Phillips, Daughter, 45
   Glasthule Road" is why the 1938 Joseph entry is sound, and "James Kerrigan,
   Inmate" is why the 1932 Grangegorman entry is not (to be kind, it is why two
   separate identifications of it were made and then withdrawn).
3. **Cross-checking ages across 1901 / 1911 / death.** Three readings that do
   not agree is itself the finding: for Joseph it exposed the 1911 census age
   as an error, and it caught the household row read as "65 y 7 m" that is
   actually "5 y 7 m" — a five-year-old son, not a 65-year-old father.
4. **The NAI census API** — `https://api-census.nationalarchives.ie/census/query`
   returns full 1901/1911 household rows. Free, fast, no browser needed. It
   gave the 1901 Bow Bridge/Camac View household, the 1911 Camac Terrace
   household, the Bryan household with Hannah in it, and the *other* Reyner
   family in Tipperary and Blythe's Avenue. **It does not hold 1926.**
5. **PRONI valuation revision books** — `https://apps.proni.gov.uk/val12b/`,
   free, and the images are legible. This is where the Cromkill evidence came
   from, after the printed Griffith's transcription had failed.
6. **The *PRONI Guide to Church Records* PDF** — turns "no baptism survives"
   into "exactly one register can hold it, here is its reference."
7. **Searching a rare surname by surname only.** The civil index strips middle
   names, so *John Mervyn* is indexed as plain *John*, or as *Mervyn* if that
   was registered first. A forename in the box is the commonest way to a false
   blank — along with the spelling variants (Reyner, Reynor, Rayner, Raynor,
   Ryner, Reiner, Rainer).

---

## 4. What did not work — do not retry blind

**Blocked from this environment (403 / gone / not extractable).** Recorded in
full in `macartney-plan-execution-2026-10-26.md` §4:

| Source | Status | Consequence |
|---|---|---|
| irishgenealogy.ie — search pages, record pages **and** `/files/civil/...pdf` | **403** (Cloudflare) | no direct fetch of register images; the user's browser is the workaround |
| askaboutireland.ie Griffith's | **403** | used the PRONI revision book instead (it is better anyway) |
| titheapplotmentbooks.nationalarchives.ie | **host gone** | tithe evidence is the parish transcription, not NAI images |
| registers.nli.ie | **403** | Catholic registers; not this family's denomination |
| Registry of Deeds Index Project | reachable, results script-loaded | deeds search not executed |
| PRONI eCatalogue | async "Searching…" shell | catalogue queries unresolved |
| r.jina.ai text proxy | **401** (IP reputation) | no workaround to the 403s |
| British Newspaper Archive / Irish Newspaper Archive | 403 / paywall | no 1870 or 1884 notices read |

**Coverage limits — blanks that mean nothing about the name:**

- **irishgenealogy.ie births stop at 1924/25** (marriages to 1949/50, deaths to
  1974/75). A 1932 birth therefore **cannot** appear there, ever, this year.
  **Do not re-run that search.** The site extends the range about a year at a
  time, so 1932 opens roughly 2030.
- **The 1926 census is not in the census API** — every Reyner query returns 0.
  It needs the Form B1 images on the National Archives' 1926 site (free), which
  are per-household, so they need the address.
- **The civil index carries no mother's maiden name**, so a "Reyner × Evans"
  birth cannot be filtered that way; district and year are the only filters.
- **The six counties are excluded** from FamilySearch's Irish civil index.

**Wrong turns worth remembering (all logged in `reyner-actions.md` §F):**

- The 1932 Grangegorman *Samuel Reyner* entry (age 73, of Leland Place) was
  claimed as ours and withdrawn the same day. It is now attributed by age,
  address **and** elimination to **Samuel Reyner of Blythe's Avenue**, railway
  checker, b. 1858/59 — a probable brother of Joseph, i.e. collateral. The
  lesson: a fellow-patient informant is the weakest source in the register, and
  an identification resting on it must be proved by elimination, not asserted.
- The great-grandfather was briefly written **"Samuel Joseph"**. He was
  **Joseph** on the 1901 census, on the 1911 census and at his death in 1938.
  The extra name existed only to reconcile him with the wrong 1932 entry. Drop
  it.
- A 1944 date on the marriage certificate looked like a family event; it is a
  registration-office artefact (an occasional copy for the Registrar-General).
- "Samuel Arthur died about 1940" has **not** been verified. Treat it as family
  recollection.

---

## 5. To do next — in order

### Tier 1 — free, one sitting each

1. **1926 census Form B1 images** (free, National Archives 1926 site). Three
   households are worth the pull: **32 Carnew Street** (does the seven-person
   1911→1926 household still stand, and who is left in it); **Joseph Reyner**,
   who is *not* in it — he died in Dún Laoghaire in 1938, so look for him in
   the Dún Laoghaire/Glasthule area; and **Charlotte Place, Drumcondra** (a
   Reyner there names the wife: **Matilda ⇒ the Blythe's Avenue Samuel**;
   Hannah or a later wife ⇒ ours). This is the highest-value free step in the
   Reyner line.
2. **John Mervyn's 1932 birth reference** — FamilySearch *Ireland, Civil
   Registration Indexes, 1845–1958* (free account) or FindMyPast's Irish birth
   index. **Surname only, all variants**, districts **Dublin North** (32 Carnew
   Street is north city), **Dublin South** and **Rathdown** (Blackrock,
   Kingstown, north Wicklow — if Mary Jane was with the Evans family at
   Greystones). Yields district + volume + page.
3. **Joseph Reyner × Hannah Bryan, marriage c.1896** — now that Hannah's maiden
   name is known (H6). A marriage certificate of that date **names both
   fathers**: the cheapest surviving route from Joseph up to John of Co. Louth.
4. **Samuel Arthur's death** — civil deaths, **all counties**, 1930–1955,
   variants Reyner/Reynor/Rayner/Raynor/Ryner/Reiner. Re-run before concluding
   anything from the earlier Co. Dublin-only pass.
5. **Betty (Dorothy Elizabeth Reyner, b. Dec 1915)** — the sister who raised
   John Mervyn after July 1946. Her **marriage** (civil, surname Reyner, first
   name Dorothy, 1936–1965) names her father and gives her address; or her
   **death** (1950–1980) settles that she never married. Also the **1939
   Register** for England & Wales, in case she emigrated. Where she lived is the
   open question behind it.
6. **Dublin electoral registers 1946–1955** (free, Dublin City Library & Archive
   Pearse Street / NAI) — check **32 Carnew Road** year by year: still Reyners,
   and is Betty registered there.
7. **Greystones register image `5624084.tif`** — the parish register page rather
   than the certified copy; may show Evans or Reyner siblings marrying.
8. **Cemetery registers** — Glasnevin, Mount Jerome, Deansgrange, St Michan's.
   One Reyner plot could date Samuel Arthur, Mary Jane and Sammy together.
9. **Evans line backwards** — **John Evans, postman** (b. c.1852, Co. Wicklow)
   × **Elizabeth** (b. c.1861, Co. Dublin), married c.1886; the marriage names
   his father and her maiden name. Plus **Mary Jane Evans's baptism**,
   Greystones, Nov 1888.

### Tier 2 — letters, slow, start them now and forget them

10. **Grangegorman / St Brendan's records, reference `PRIV/1223`, National
    Archives of Ireland.** Restricted; needs the institution's written
    permission, and NAI advises where to send it. Three letters in parallel:
    NAI Reading Room (finding aid for the 1940s volumes; who is the current
    data controller), **HSE** (data-access request as grandson, with the death
    certificate), and **Grangegorman Histories, RIA**. Ask for **Mary Jane
    Reyner's admission register** (1946) and death register — the admission
    entry carries the **admission date** and the **nearest relative with
    address**, which may place Betty and so answer Tier 1 item 5. Put the 1932
    *Samuel Reyner* entry to them as a separate question (see §4).
11. **John Mervyn's UK naturalisation file** — The National Archives, Kew,
    **HO 334**, 1960s–70s; Discovery is searchable by name for free. A
    naturalisation certificate states **date and place of birth**, so it
    answers the 1932 birth question *and* pins the year he took UK nationality
    (currently only "the 60s or 70s").
12. **Order the 1932 birth certificate** once item 2 gives the reference: €20
    certified online via the HSE, or **€5 uncertified photocopy** from the
    **GRO Research Room, Werburgh Street, Dublin 2** (walk-in **Tuesdays
    only**, 9.30–12.30 and 14.00–16.30; email five days a week,
    `GROResearchRoom@welfare.ie`). Its indexes run **from 1922 onwards**, so the
    entry can be found there in person with no online index at all.
13. **Macartney: Connor Presbyterian `MIC1P/162`** (PRONI, or a subscription
    lookup) — a **Richard Macartney, son of Henry, baptised c.1841**, plus
    siblings. The single highest-value record in the Macartney research.
14. **Macartney: Henry's death**, 1864–1884, Ballymena district, with a son as
    informant; or a **marriage 1864+ of Matthew or James Macartney of Cromkill
    naming Henry as father**. Any one of the three joins a generation.
15. **Accra marriage, c.1956–57** (John Mervyn × Margaret Davies) — states his
    **age** and his **father's name and occupation**: an independent check on a
    1932 birth, and the only document that speaks about him between 1946 and the
    1960s. Ghana's Register-General's Department, or the officiating mission's
    registers.

### Tier 3 — paid, archive visits, or decisions

16. **Irish Railway Record Society staff records, 1870–1940** (306,000 records,
    digitised 2024) — for **Samuel Arthur** (passenger guard) and **Joseph**
    (pensioner, died 14 Dec 1938). Gives birth date and place, **stations
    served** (which would test the Blackrock/Greystones memory in the
    employer's own hand), grades, and date of leaving.
17. **PRONI `D/1062/2/4/1`** — the 1772 Macartney estate map/tenant volume. Ask
    one focused question: does it cover Cromkill or any Connor-parish townland,
    and is there a viewable or copyable tenant index. A tenant match would show
    tenancy only, not descent.
18. **The 1734 Ballintoy religious census** — a promising pre-1800 local list
    that could not be accessed; no McCartney entry verified.
19. **DNA** — needs a living male-line Macartney and comparison lines, and the
    owner's decision. A mismatch could exclude a shared male line; a match alone
    would not name an ancestor.
20. **Outreach** — nothing has been sent to any archive, cousin or forum yet.
    Every letter in Tier 2 is drafted in the action lists but unsent.

---

## 6. House rules for this research

Kept deliberately, because they are what has stopped the last two errors being
published as facts:

- **No generation is joined by matching a name, a surname or a place.** A
  shared surname in the right county is a lead, never a link.
- **Every claim cites a record.** "Documented", "candidate", "family
  recollection" and "inference" are different words on purpose; the status
  tables use them that way.
- **Say who the informant was.** The strength of a death entry is the strength
  of the person who reported it.
- **Contradictions stay visible.** Where sources disagree (Joseph's age across
  three records), the disagreement is recorded rather than smoothed to an
  average. Corrections are logged, not deleted — `reyner-actions.md` §F keeps
  every withdrawn claim on the record.
- **An unproved link is reported as unproved.** The Earl Macartney question is
  the model: the answer is "no record read joins them", which is neither a yes
  nor a no.

---

## 7. Repo and app state, 2026-10-27

- **The app and its evidence surfaces are committed and green.** Verification
  run on this tree: `npm run typecheck` → exit 0; `npm test` → 10 files, **120
  tests passed**; `npm run build` → exit 0 with `/compare` in the route table;
  `npm run e2e` → **all 20 steps passed** (it builds and serves the real app
  against an embedded Postgres and drives join → tree → compare → Henry's
  evidence → edit → comment → fact → image → question → invite → logout).
- **Research status is committed with it:** this file, `docs/reyner-actions.md`,
  `docs/macartney-lines-2026-10-25.md`,
  `docs/macartney-plan-execution-2026-10-26.md`,
  `docs/GATES-macartney-lines.md`.
- **Three real defects were found and fixed before committing** — each had been
  hiding the next behind it, and all three made the proof run lie:
  1. **`research_evidence` was stored double-encoded.** The writers ran
     `JSON.stringify()` on a value bound next to a `::jsonb` cast, and
     postgres.js serialises that itself, so the column held a JSON *string*.
     `/compare` then failed closed (500) rather than invent evidence. Writes now
     cast `::text::jsonb`, and the reader accepts both shapes so rows written the
     old way still render.
  2. **Henry's profile panel never printed the canonical sourced summary** that
     the proof run asserts — it is now rendered on the record itself, from the
     same stored value `/compare` uses.
  3. **The proof run leaked its server.** Killing the `next start` wrapper left
     the server child holding port 3315, so the next run could not bind, passed
     its readiness check against the **stale build**, and reported failures (or
     could have reported passes) from old code. The server is now spawned in its
     own process group, killed as a group, and the run aborts if the port is
     already serving.
- **`.research-tmp/` is scratch** — downloaded PDFs (Macafee 1740, the 1796 flax
  list), census API responses, census-image attempts. Nothing there is a source;
  the sources are quoted in the reports. Kept out of git.
- **No live database write, deploy or push was made during the research passes.**
  The app was verified against an embedded Postgres, never the live Supabase
  project.
