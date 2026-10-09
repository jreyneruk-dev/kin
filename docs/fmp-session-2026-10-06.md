# FindMyPast co-pilot session — 2026-10-06/07

> **2026-10-07 update — WILLIAM'S PARENTS NOW PROVEN.** The full 1896
> marriage register was human-read (Opus 5.5 on John's enhanced images): the
> groom's father column names **Richard Henry Macartney (dec'd), Traveller**
> — an exact match with the 1870 St Mark's groom, closing the parent link
> with primary evidence. Full ceremony reading, banked facts 29–35 and new
> person 31 (Alfred Grainger) are documented in
> `mabel-and-parents-2026-10-07.md` §1c. The OCR-based wording below is
> superseded for the parent link (though the register itself is the same
> document — read from John's enhanced images, not OCR).

## Pass 2–4 completed (2026-10-07): the whole Dublin family documented

**Headline: michael's "the six were born in England" line is wrong. They were
all born and registered in Dublin — and William H's middle name is Henry.**

### Pass 2 — William's own birth ✅
- 18 William Macartney births 1861–1881 in Ireland. Three 1871 candidates:
  plain William (Ballycastle), William **Henry** (Dublin South), William **Hugh**
  (Downpatrick).
- William Henry, Dublin South, 1871 = ours. Chain of proof:
  1. Marriage register (irishgenealogy.ie free image, marriages_1896
     5820548.pdf) reads **"William Henry" Macartney × Edith M. Grainger,
     8 Jun 1896, Dublin South** — initially via OCR/human read, now fully
     human-read from John's enhanced images (§ above + memo §1c, which also
     closes the parent question).
  2. Daughter Eileen's baptism (see below) names **father: William Henry
     Macartney** — independent confirmation.
  3. No other William Henry Macartney birth in 1861–1881 anywhere in Ireland.
- Banked as **fact 19** on William (documented, primary, FMP transcript URL
  IRE/BMD/D/568742130); his card is now **William Henry Macartney**, birth
  place **Dublin South, Ireland** (GRO vol 12 p 709).
- The marriage register image also gave the exact marriage date — union 1 in
  the DB now carries 8/6/1896 Dublin South (was blank).

### Pass 3 — the six siblings ✅ (five registered, Eileen found via church record)
All with mother's birth surname **Grainger** (one indexed "Granger"):

| kin person | registered as | date | district | fact |
|---|---|---|---|---|
| 4 Richard H | Richard Macartney | 29 Mar 1898 | Dublin South | 20 |
| 6 Mabel C | Mabel Macartney | 24 Jun 1900 | Dublin | 21 |
| 10 Charles E | Charles **Mc**Cartney | 19 Jul 1902 | Dublin | 22 |
| 11 Ruby | Ruby Macartney | 22 Mar 1905 | Dublin | 23 |
| 8 Kathleen S | Sheila **Mc**Cartney | 10 Apr 1907 | Dublin | 24 (likely) |

- Exact birth dates + places set on each card. Note the Mc/Mac drift inside
  one family (Charles and Sheila registered McCartney) — matches the
  "Macartney (Ulster) vs McCartney (England)" spelling story, but here it's
  Dublin-side inconsistency, not an England move.
- **Sheila vs Kathleen**: kin's "Kathleen S Macartney" (no dates) is probably
  Sheila McCartney b 1907 (initial S). Filed at confidence "likely" — rename
  only after John confirms.
- **Eileen (person 3) solved by church records**: no civil registration under
  Eileen/Maud × Macartney/McCartney 1896–98 (genuine index gap), but
  irishgenealogy.ie church records hold **Baptism of Eileen Maud Macartney,
  16 Dec 1896, St James (Church of Ireland), Dublin** of **Milbrook House,
  Old Kilmainham** — father **William Henry Macartney**, mother **Maud Edith**
  (Edith Maude inverted). Book 6 p 128 e 1014, DU-CI-BA-82523.
  → **fact 25** (documented); her card is now **Eileen Maud Macartney**,
  b 1896, Old Kilmainham. michael's "1897" was a round-up.
- Curiosity parked: **"Guinle Maria Macartney", Q4 1898, Dublin South (vol 2
  p 544)** — not Eileen (born 1896), only months after Richard (Mar 1898);
  either an unrelated Dublin South family or a child who died young. The
  register image resists OCR; needs human eyes (image linked in the GRO
  record cibi-10175959).

### Pass 4 — marriage ✅ (was already in kin, now evidenced)
The marriage fact (1896 Dublin South Edith M Grainger, Irish Marriages) was
already on William's card from michael's data; this pass attached the primary
evidence (register image + OCR) and filled the empty union row. No separate
fact needed.

### New leads opened
- **Milbrook House, Old Kilmainham** — family residence Dec 1896; census
  1901/1911 would map the whole household (census.nationalarchives.ie was
  unreachable this session — timed out; retry later).
- **Mabel Macartney b 1888** (kin person 27, sister of William via the Unknown
  parents) — a Dublin civil search for her would identify the parents'
  names in one hop (mother's surname column + father on the register image).
- The 1871 birth register image (births_1871 2204492.pdf) would give William
  Henry's **parents' names** — handwriting, Vision OCR garbled it; same
  human-eyes follow-up as Guinle Maria.

### Tooling notes for next time (all verified this session)
- irishgenealogy.ie modern search: GET `https://www.irishgenealogy.ie/search`
  with `church-or-civil=civil|church|all, firstname, lastname, yearStart,
  yearEnd, event-birth=1, mothers-surname=, location=` — mother's-surname
  filter works and catches index typos only if you search the typo too
  (Granger for Grainger).
- Record pages: `/view?record_id=cibi-<grid>` (civil birth), `cima-<grid>`
  (civil marriage), church records use a UUID-style id. Register images are
  **free PDFs** (`irishgenealogy.ie/files/civil/...pdf`) even for recent-ish
  years.
- OCR pipeline that works on macOS without new installs:
  `pdftoppm -r 400 -png x.pdf out` → `swift scripts/ocr.swift out-1.png`
  (Vision framework; good on typed/printed pages, weak on handwriting).
- FMP record detail URL: `findmypast.co.uk/transcript?id=IRE/BMD/D/<id>`
  (search-results cards carry no hrefs; record ids come from the page's
  Apollo cache, `window.__APOLLO_CLIENT__.cache.extract()`).

### irishgenealogy.ie sweep mechanics (verified 2026-10-07, Alfred digs)
- `/search` 301s to `/search/` — use the trailing-slash form (or `curl -L`)
  or you get an empty WordPress-cached shell page.
- Pagination/limits are URL params: `per_page=100`, `pg=N` (site JS also
  supports `sortby`). Default page is 10 — sweeps silently miss rows
  without `per_page`.
- Civil death record ids: `cide-<grid>`; many 1864–1877 death rows ALSO
  appear as `cidenc-<grid>` duplicates of the same event — dedupe on the
  grid number.
- The register-image href on /view pages is always `.pdf` (the `.tif` in
  the "Image path" table is internal — fetching it returns the homepage).
- `location=` expects exact district/area text (e.g. `Dublin South`);
  bare `dublin` matches North+South only (verified via controls) and
  excludes Rathdown etc.
- The results page embeds "N results found" plus a districts sidebar with
  per-district counts — good for cluster mapping without opening rows.
- Fuzzy matching is aggressive: `alfred grainger` returns Fred Granger,
  Arthur Grainger, Alfred Gorman etc. A "0 results" after a known-hit
  control means the absence is real.

---

# Pass 1 (2026-10-06) — Ireland Births 1896–1906

Two of your observations answered, plus the session log.

## 1. "The browser is oscillating around the same data"

It was **ad-tech reload loops**, not the search: the FMP SPA kept re-firing
Google DoubleClick/Facebook Pixel page-view beacons (the `~oref=` URLs in the
network log), each one re-rendering analytics state — so the page *looked*
like it was churning through "the same data". On top of that, the earlier OneTrust
cookie banner and an overlay-zombie state from my first synthetic clicks left a
wedged, unresponsive tab; that tab has been closed and replaced.

What is now pinned down for automation (these actually filter, verified in the
session):
- `yearofbirth=1901&yearofbirth_offset=5` — the ±5 year window
- `collection=civil%20births` — the free "Civil Births (260)" subset
- `country=Ireland` — restricts to Ireland Births 1864-1958
- `o=datasetname&d=asc` — sort results by record set
- `_page=N` — pagination works server-side, so lists can be walked in order

These go on top of `lastname=macartney` in the standard
`/search/results?...` URL. UI-driven filters from the filter drawer often
don't reflect in the URL — going by URL params is the reliable road.

## 2. "England & Wales Births seems pointless for Macartney"

Right on the evidence: in the Irish-only slice there are 103 Macartney births
1896–1906 (harvested below), and the districts are Belfast (dominant), Dublin
North and South, Newry, Lisburn, Armagh, Ballymena, Magherafelt, Clogher,
Newtownards, Kilkenny, Tipperary, Rathdown, Fermanagh.

The E&W slice we saw earlier was the general civil-births pool before
narrowing — those E&W rows were the non-Irish tail of the 260 free-view
Civil Births. That said, the original six siblings (William H × Edith Maude
**Grainger**, 1897–1905) register with the **England & Wales** GRO index
with mother's maiden name Grainger (michael's Ancestry data put the family
in England by 1897). So **both pools matter**, just for different questions:
- **Ireland Births** → William's own 1871 birth, whether any siblings stayed
  in Ireland, and the wider surname context (this pass).
- **England & Wales Births with mother's maiden name Grainger** → the actual
  six-sibling registrations (pass 2).

## What got banked in kin

- Full Irish harvest archived: `kin/src/lib/irish-births-1896-1906.md` — with
  the exact working URL and the 103-name list, organised by district.
- One indexed session comment on William (person 1) pointing at the archive —
  visible on his profile and searchable. No facts added; nothing here ties to
  *our specific* family members yet.
- The search is also SAVED inside FindMyPast's own UI ("Save this search" —
  reachable under the user menu → Saved searches).

## Next pass (pass 2, specific people)

1. **First name William, Irish slice, 1866–1886 (±10 of 1871)** → if William
   H's own 1871 Irish registration exists, this surfaces it (district +
   mother's maiden name appear in the free index view).
2. **England & Wales Births with mother's maiden name Grainger** for the
   1897–1905 six-sibling registrations (parameter name to verify: probably
   `mothers_maiden_name` or similar).
3. **Marriage — William H × Edith Maude**, England & Wales Marriages,
   1886–1896 window; free index gives district + maiden surface, certificate
   only if wanted.

---

## Appendix — the 103 Irish Macartney births, 1896–1906

See `kin/src/lib/irish-births-1896-1906.md` for the full list by district.
Key clusters:
- Belfast (Antrim & Down): ~45 names
- Dublin North/South/Rathdown: ~15
- Newry, Lisburn, Armagh, Ballymena, Magherafelt, Clogher, Newtownards,
  Kilkenny, Tipperary, Fermanagh: the rest
- Zero hits in this surname slice for "McCartney" spelling in Ireland —
  matches the family's split Macartney (Ulster) vs McCartney (England)
  hypothesis, but not conclusive from births alone.
