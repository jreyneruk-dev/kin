# Mabel Snr & William's parents — research memo, 2026-10-07

Follow-up to `fmp-session-2026-10-06.md` (passes 2–4). Question John asked:
"Mabel Macartney is believed to be William's sister, based on family memory
and her appearing on 1925 London→Australia travel records alongside Constance
Macartney (believed = Mabel Constance b 1900). Can we learn more about Mabel
Snr — her birth, and William's parents?"

## 1. William's parents: PROVEN — Richard Henry Macartney × Dora Dunne ✅

**Marriage: Richard Macartney × Dora Dunne, 6 Sep 1870, Dublin South**
(GRO Group Registration ID 2720627).

**2026-10-07 update: this is now conclusive — the 1896 register's father
column names the 1870 groom exactly. See §1c.**

Evidence:
1. Marriage index hit at irishgenealogy.ie (civil, exact names, right
   district, right window); record page
   `https://www.irishgenealogy.ie/view?record_id=cima-2720627` links a FREE
   register image
   (`files/civil/marriage_returns/marriages_1870/11393/8183202.pdf`),
   downloaded locally. The handwritten party rows defeat Vision OCR (only
   page headers came through), so details beyond the index — the couple's
   fathers, witnesses, religion — **need John's eyes** on that image
   (2-minute job, human login to irishgenealogy.ie not required for this
   one? — the view page itself serves the PDF publicly, same as all the
   others used this session).
2. William's 1871 birth register row (image used in pass 2) OCR-fragments to
   "Richard… Macart[ney]… Dunne… Church Avenue… [commercial] [t]raveller" —
   the same father/mother/occupation/residence cluster.
3. Mabel's 1881 birth register row OCRs cleanly: father "**Richd
   Macant[ne]y**", occupation "**commercial traveller**", residence
   "**[B]alls[bridge]**", mother "formerly **DUNNE**".
4. Only one Mabel Macartney birth exists in the entire Irish civil index
   1864–1892 — this one. "Mabel Macartney" is otherwise absent everywhere.

kin changes (all via API, HTTP 200):
- person 25 "Unknown Father Macartney" → **Richard Henry Macartney**, d. 1884,
  Dublin South, age 43 (civil death index Group Reg ID 5952489 — same
  district, age consistent with an 1870 marriage). Card carries the full
  1870 groom-row reading (below).
- person 26 "Unknown mother (William)" → **Dora Dunne**, no death date
  (alive Sep 1881 as Mabel's informant; no matching civil death 1871–1901
  under Dora/Dorah × Macartney/Dunne/Duane/Downes — the Dublin South hits
  that came back were unrelated: an age-58 Dora Dunne 1875, an age-42 Dorah
  Dunne 1872, an age-0 child 1879). Card carries the full bride-row reading.
- **NEW persons (2026-10-07, human read of the register image — Opus 5.5
  assisted, John reviewed):**
  - **person 28 — Henry Macartney, farmer**, groom's father (created via
    POST /api/people `parent-of` person 25; union 10 with an open partner
    slot). William Henry's middle name HENRY honours this grandfather — the
    Henry name runs Henry → Richard Henry → William Henry. Farmer fits the
    Ulster-origin story; farm location is a research lead.
  - **person 29 — Richard Eyre Dunne, M.D.**, bride's father (`parent-of`
    person 26; union 11). Corroboration pending in 1870s Dublin medical
    directories (Thom's / Irish Medical Directory / The Medical Directory on
    Internet Archive) — not indexed on the open web.
  - fact 27 (marriage, documented/primary) + fact 28 (occupation, likely)
    filed on person 25.

## 1b. The full register reading (human/Opus, 2026-10-07)

Entry 84, St Mark's Parish Church (Church of Ireland), City of Dublin,
6 Sep 1870, **by licence**:

| | Groom | Bride |
|---|---|---|
| Name | **Richard Henry Macartney** | Dora Dunne |
| Age/Condition | Full, Bachelor | Full, Spinster |
| Occupation | two-line split read **Commissariat Assistant?** (uncertain — army supply role) | (blank) |
| Residence | **7 Burgh Quay** | **Milton Terrace, Bath Avenue** (Sandymount/Ballsbridge) |
| Father | **Henry Macartney, farmer** | **Richard Eyre Dunne, M.D.** |

Witnesses: **George Dunne** (likely Dora's relative — research lead) and
**Samuel Hazlitt**. Officiant read as Abraham S. Fuller(?). Certified 12 Oct
1870 (entries 81–84) by the parish clerk (Sterling/Stirling Tomlinson?).
Signature spelling could be Macartney or MacCartney — aliases kept open.
Enhanced scans in John's Downloads/Macartney/Richard_Dora_Marriage_*.

Consequences: (a) the Henry naming chain; (b) if Commissariat is right,
TNA WO Commissariat Department staff records may document Richard's 1860s,
with a move to commercial travelling by 1881; (c) a licence marriage means a
diocesan marriage-licence bond should survive (RCBL / National Archives
Ireland, Dublin diocese, 1870) — an independent copy of the names.

Honesty ledger: an earlier in-session draft attached unverified details to
Richard (middle name Daniel, father Daniel of London, Glasnevin burial) —
sourced from nothing retrievable; **all purged before save**. Same for a
"4/12/1877" death date for Dora that appeared and was retracted. The cards
hold only index-backed facts.

## 1c. The 1896 register read: the father column closes the question — CONCLUSIVE (2026-10-07)

John ran Opus 5.5 over his enhanced images of the 1896 marriage-register
copy (`~/Downloads/Macartney/William_Edith_Marriage_{enhanced,cleaned_only}.png`;
irishgenealogy record **cima-2258498**, PDF `marriages_1896/10491/5820548.pdf`,
ref 05820548, page 601, Schedule G, Registrar's District of Dublin). A
typeset-form copy in a steady hand — far tidier than the 1870 origin register.

| | Groom | Bride |
|---|---|---|
| Name | **William Henry Macartney** | **Edith Maud McSwiney? Grainger** |
| Age/Condition | Full, Bachelor | Full, Spinster |
| Occupation | **Inquiry Officer** | — |
| Residence | **8 Sandymount Av.** | **9 Chelmsford Road** |
| Father | **Richard Henry Macartney (dec'd)** | **Alfred Grainger (dec'd)** |
| Father's profession | **Traveller** | **Traveller** |

Married at **Methodist Church, Rathmines**, 8 June 1896, according to the
usage of the Methodist Church **by licence**; officiant read as W. B. Lumley?;
entry no. read as 22 (left edge cropped); signed W. H. Macartney / Edith M.
Grainger; witnesses **Edward George Gregory** and **Margaret M. Neilson**;
printed left margin: "This margin not to be written on".

**Why conclusive:** the groom named *Richard Henry Macartney (dec'd),
Traveller* as his father — an exact match with the 1870 St Mark's groom
himself, not merely an index echo. The occupation chain fits (Commissariat
Assistant? 1870 → commercial traveller 1881 → Traveller 1896), and the 1884
death (age 43) fits "(dec'd)" by 1896. William's 1871 index row already
paired father Richard × mother DUNNE; the register now states it directly.
Until today the ladder read "strong circumstantial"; it reads **proven**.

kin changes (all via the API, HTTP 200; DB- and live-page-verified):
- **facts 29–31** on person 1 (documented/primary): the full ceremony
  reading; 1896 occupation Inquiry Officer; residence 8 Sandymount Avenue.
- **fact 32** on person 1 (documented): married per the usage of the
  Methodist Church — William was Methodist; his daughter Eileen's baptism
  five months later was COI at St James.
- **fact 33** on person 1 (likely): entry-no. 22 and "W. B. Lumley?" —
  uncertainty quarantined into an explicitly uncertain note.
- **fact 34** on person 2 (likely): "Edith Maud McSwiney? Grainger" — the
  third name is likely her mother's maiden name, unconfirmed; the register
  spells "Maud" (michael's tree has "Maude").
- **fact 35** on person 25 (documented): father logged as "Traveller" in
  1896 — corroborates the 1881 traveller reading inside his lifespan.
- **person 31 — Alfred Grainger** (bride's father, dec'd, Traveller),
  created with a `parent-of` link to person 2 → union 12 with an open
  partner slot. Process note: the FIRST create omitted the `link` payload
  (person 30, created unreferenced) — deleted and re-created correctly.
  After any linked create, check the union/children row, not just the id.
- notes PATCHes on persons 1, 2, 25 ("…closes the parent question"). NB
  person pages render the fact cards, not the notes field — the evidence
  lives on facts; notes are edit-form context.
- **Tree layout fix (same day):** John found Alfred in People but missing
  from the Tree. Cause: `generationsOf` in `src/lib/tree.ts` never gave a
  row to an open-slot parent reached only through a children(row) link whose
  child is the anchor's SPOUSE (upward walk + old spouse-snap both miss
  him). Fixed with a bounded fixed-point snap pass (spouse → partner's row;
  co-parent of a placed child → one above it); 2 regression tests added
  (79 pass), deployed, and Alfred now renders on the grandparents' row
  beside Richard Henry ⚭ Dora.

Honesty ledger: "McSwiney?", entry 22 and "W. B. Lumley" are filed as
*likely* with the uncertainty written into the wording; every other banked
value is a clearly legible register column. Transcriptions by Opus 5.5 on
John's enhanced images (John reviewed).

## 1d. The Alfred digs (2026-10-07): both NEGATIVE — which is itself evidence

With John's go-ahead both Alfred threads were run to the end of the free
Irish indexes:

- **Dig (a), death:** NO death registration for any Alfred Grainger (nor
  Granger, Grainge) anywhere in Ireland, 1864 (registration start) – 1930,
  civil index; nor in the church-records database (Grainger burials there
  stop ~1851). Only fuzzy near-miss: "Fred Granger", Galway 1930, age 61
  (cide-1723146) — not a match. Since the 8 Jun 1896 register already reads
  him as dead, his death was either never registered, or registered under a
  spelling outside the index's fuzzy reach. Banked as **fact 36** on
  person 31 (documented, sourceKind negative).
- **Dig (b), marriage:** NO marriage for any Alfred Grainger/Granger/Grainge
  as groom in the civil index (any year) or church records (any year).
  Alfred's bride therefore remains unconfirmed from the Irish index alone;
  the McSwiney? third-name hypothesis on Edith stays at *likely* (fact 34
  unchanged). Banked as **fact 37** on person 2 (documented, negative).
- **The one live lead:** the civil marriage sweep 1845–1875 (surname
  Grainger) surfaced **Arthur Grainger × Susan Sweeny, 4 Jul 1873,
  Rathdown** (cima-2822271, stamp 08137620). Rathdown is the district
  immediately south of Dublin city; a Sweeny/Swiney bride married to a
  Grainger one year before Edith's estimated birth is exactly the McSwiney
  pattern — but the groom is Arthur, not Alfred, and the register image
  (free PDF `marriages_1873/11279/8137620.pdf`) defeats OCR. The 400-dpi
  image is embedded in `docs/temp-register-view.html` (Preview tab) for
  **John's human read** — the groom's *father* column would confirm or kill
  a connection to our Alfred, and the parties' ages would bound Alfred's own
  birth year if Arthur proves to be a brother/cousin.
- Context learned: Dublin Grainger deaths 1864–96 cluster in Dublin South
  (25 rows, none Alfred); Grainger church marriages in the free DB are
  mostly RC (St Andrew's, Cork parishes) — COI Dublin coverage
  (Monkstown/Taney etc.) is thin, so a pre-1864 COI marriage would only
  surface via FMP or the registers themselves.

### 1d-CONFIRMED (same day): John read entry 4 — Alfred = Arthur Alfred Edward Grainger

John human-read the enhanced images
(`~/Downloads/Grainger_1873_cleaned_only.png`,
`Arthur_Grainger_Marriage_1873_enhanced.png`):

| | Groom | Bride |
|---|---|---|
| Name | **Arthur Alfred Edward Grainger** | **Susan Elizabeth Sweeny** |
| Age/Condition | Full, Bachelor | Full, Spinster |
| Occupation | **Commercial Traveller** | — |
| Residence | **Kingstown** | **Kingstown** |
| Father | **Arthur Grainger, Esq.** | **Denis Sweeny, Architect** |

12 July 1873, Parish Church of Monkstown, Co. Dublin (Rathdown district),
Church of Ireland **by licence**, officiant A. H. Palmer; witnesses Saml.
Wm. Richardson? and Martha Crooke; certified 3 Oct 1873 by J. H. Kennedy,
Curate of Monkstown (entries 3–6). GRO index date reads 04/07/1873; the
register copy reads 12 July — register read preferred, discrepancy noted.
My independent OCR pass corroborates every field ("Arthur Alfred … Edward
Grainger", "Denis Sweeny … Architect", Kingstown ×2, Kennedy's certificate).

**Why it closes both Alfred questions:**
- **Identity:** the 1896 register's "Alfred Grainger (dec'd), Traveller"
  is this man going by his middle name (he signed "Arthur A. Grainger").
  Commercial Traveller 1873 ↔ Traveller 1896; dead by Jun 1896 ✓.
- **McSwiney? → Sweeny:** Edith's mother is DOCUMENTED as Susan Elizabeth
  Sweeny — fact 34's hypothesis confirmed as a Sweeny family name (any
  "Mc" prefix in Edith's third name stays unverified).

kin changes (all HTTP 200; DB- and live-page-verified):
- **facts 38–40**: marriage + 1873 occupation on person 31; mother note on
  person 2 (documented, supersedes the fact-34 *likely*).
- **person 34 — Susan Elizabeth Sweeny** (Edith's mother): created with
  `parent-of` person 2 — which AUTOMATICALLY filled union 12's open
  partner_b slot (the createPersonWithLink logic fills a child's open
  union — no DB-direct write needed after all); updateUnionMeta then set
  union 12 to 12 Jul 1873 @ Monkstown Parish Church. Fact 41 on her card.
- **person 35 — Arthur Grainger, Esq.** (Alfred's father; `parent-of`
  person 31 → union 14, open slot), fact 42 (Esq.).
- **person 36 — Denis Sweeny, Architect** (Susan's father; `parent-of`
  person 34 → union 15, open slot), fact 43 (Architect).
- **person 31 aliases** now carry the legal name (Arthur Alfred Edward
  Grainger / Arthur A. E. Grainger / Arthur A. Grainger); card keeps
  "Alfred Grainger" pending John's preference.
- Tree verified live: Susan, Denis and Arthur all render in the correct
  generations.

New negatives (2026-10-07): Alfred/Arthur's death is in NO Irish civil
record 1873–96 (the only Arthur Grainger deaths in-window: Enniskillen age
13, Parsonstown age 0; Rathdown district: John 21 in 1864, infant Florence
Adelaide Granger 1877) — a commercial traveller could have died in England
or unregistered. All Susan/Susannah Grainger/Granger deaths Ireland-wide
are Belfast/Newtownards — Susan may have remarried or died unregistered.
Zero Grainger births 1873–96 with mother's surname Sweeny/Swiney — Edith's
absence from the birth index is a family pattern, not a one-off.

## 2. Mabel: birth FOUND — 1881, not 1888 (this flips part of the memory)

- Searching Ireland civil births (irishgenealogy.ie + FMP Ireland Births
  1864-1958), 1884–1892, both spellings Macartney/McCartney: **zero Mabels**.
- Widening: exactly ONE Mabel Macartney birth 1864–1892 in Ireland:
  **18 Aug 1881, Dublin South, GRO index vol 2 p 609 (per the FMP typed
  transcript; the register image's own page header shows 610 —
  index/image pagination differ); father Richard Macartney, mother
  DUNNE, Group Registration ID 9034873, registered Jul–Sep 1881** —
  free image at
  `https://www.irishgenealogy.ie/view?record_id=cibi-9034873`.
- The 1925 manifest record (FMP Passenger Lists Leaving UK, TNA/BT27/
  1094000006/00830) transcribes **Birth Year 1888** for Mabel Macartney,
  Sydney-bound; the full transcript is PAYWALLED (behind 7-day-trial wall)
  so the manifest's own age column could not be re-read.
- The general-search teaser ALSO surfaced **"Mabel Macartney — 1925 —
  Hampshire, England — Electoral Registers 1910-1932"** (paywalled
  transcript). Two independent 1925 England appearances = consistent with
  Mabel being England-side in 1925 before the Sydney sailing.

**Working hypothesis (explicit, needs the manifest's age before it becomes
kin doctrine):** kin's "Mabel b 1888" descends from the manifest's age
transcription or family rounding. The only documented Mabel = b 18 Aug 1881
Dublin South, full sister of William Henry via Richard × Dora. kin person 27
has been updated to **b 18/8/1881, Dublin South, Ireland** with a `note`
fact (id 26) spelling out the contradiction and the verification condition
(read the manifest age; merge stands only if it supports ~1881, reopen
otherwise). Her 1925 emigration fact 18 was left untouched.

Alternative readings that remain open (do not lock out):
- kin's Mabel-1888 is a different, unregistered girl — but the total absence
  of ANY Irish Mabel registration in 1884–92 makes this very unlikely.
- The 1881 Mabel is a cousin, not a sister — but parents/occupation/
  district all match William's exactly; "cousin" would still need Richard
  to have a brother in the same district with the same wife's surname.

## 3. The aunt+niece reading of the 1925 pair (RECONCILES John's memory)

kin already has **Mabel Constance Macartney b 1900 = person 6** (William
Henry's daughter, birth reg'd 24 Jun 1900, Dublin). If the 1925 manifest
pair is **Mabel Snr (b 1881) + Constance (b 1900)**, they are **aunt +
niece** — one household, one ticket office, plausibly one sponsor. John's
memory "Mabel Macartney travelled with Constance (Mabel Constance b 1900)"
fits with NO third person required. When the manifest is readable, its
two rows will confirm or kill this in one look (ages 43/24 vs anything
else).

## 4. Could not run this session

- **census.nationalarchives.ie unreachable** (dual-stack curl timeouts,
  ~15s, exit 28; browser nav also stalled) — 1901/1911 would show the
  Macartney household (with/without Dora) with everyone's ages in typed
  form. RETRY LATER — it is the single cheapest confirmation left.
- **BT27 transcript (TNA/BT27/1094000006/00830)** paywalled on FMP.
- **Electoral register 1910-32 Hampshire Mabel (1925)** paywalled.
- Handwritten OCR (1870 marriage party rows) — Vision can't do this clerk.

## 5. Next steps (ordered)

1. ~~Human read of the 1870 marriage register image~~ **DONE 2026-10-07** —
   see section 1b; banked as persons 28/29, facts 27/28, cards 25/26.
2. **Retry the 1901/1911 Irish census** for the Macartney household in Dublin
   South / Pembroke / Rathdown (typeset pages, fully free). One hit maps
   the entire family with confirmed ages (Mabel's age column settles her
   birthyear INDEPENDENT of FMP). census.nationalarchives.ie was unreachable
   all session — retry off-peak.
3. **Verify the 1925 manifest age** (buy the BT27 row or 7-day FMP trial) —
   this is the merge-condition fact 26 names.
4. **Corroborate Dr Richard Eyre Dunne, M.D.** in 1870s Dublin medical
   directories (Thom's Irish Almanac, Irish Medical Directory, Medical
   Register — Internet Archive has scanned runs) and note his college/years.
5. **Marriage-licence bond** for the 1870 marriage (Dublin diocese, RCBL or
   National Archives Ireland) — second independent copy of the names.
6. **Glasnevin burial register lookup** (paid) for Richard (d 1884) and
   Dora (d unknown, after 1881).
7. **George Dunne** (witness): likely Dora's brother — a Dublin South Dunne
   birth/marriage sweep could name more of her siblings.
8. ~~Human read of William's 1871 birth row (entry 149)~~ — DEMOTED: the
   1896 register's father column supersedes it as parent evidence; keep as
   an optional formal confirmation of the register mother-column wording.
9. ~~John's human read of the Rathdown 1873 return~~ **DONE 2026-10-07** —
   CONFIRMED: Arthur Alfred Edward Grainger × Susan Elizabeth Sweeny; see
   §1d-CONFIRMED. Alfred's card has aliases now; rename pending John.
10. **FMP route for COI Dublin registers** (Monkstown/Taney area) — now
    sharpened: hunt **Arthur Alfred Edward Grainger's baptism**
    (~1845–53, likely Monkstown/Kingstown COI) and **Arthur Grainger
    Esq.'s marriage** (~1830s–40s). Free-lead: Arthur Grainger × Susanna
    Clay, 19 Sep 1824, St Peter's Dublin (COI) is in the index — timing
    fits a son born ~1845–52, but UNPROVEN; do not link without
    corroboration (ages/parish from the 1824 register image).
11. **Denis Sweeny, Architect** in Thom's Irish Almanac / Dublin street
    directories (Internet Archive scanned runs) — practice, address,
    possibly a death notice.
12. **Susan's fate**: no registered death as Grainger (all Belfast) —
    check FMP Ireland Marriages for a Susan/Susannah remarriage
    (spouse-search), 1901/1911 census for a Susan b. ~Kingstown of the
    right age, and Monkstown COI burial registers via FMP.

Machine-generated OCR claims are quarantined in notes, not on card fields.
All card values trace to a cited index or register image.

## Follow-up, 2026-10-09 — Henry Macartney's place, and the junction verdict

`henry-origin-2026-10-09.md`: the civil indexes under every Macartney spelling
(no Henry probate ever, his marriage predates 1845), the Antrim/Down townlands
the surname's farmers actually held, the cadet-branch sweep (no farmer, no
Henry), and the plain verdict — same surname, no provable link, the prior
stands. Facts 99–106. Next step stays what it was here: pin our side to a
parish, beginning with the 1870 marriage-licence bond and a human read of the
five candidate death registers.
