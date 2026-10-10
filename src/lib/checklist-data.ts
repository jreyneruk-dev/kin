/**
 * The junction checklist — every open record between the family and a provable
 * link to the documented Macartneys of Lissanoure, as one row per record to
 * read.
 *
 * Source of truth: docs/henry-origin-2026-10-09.md — §1 for the five adult
 * death candidates (Henry Macartney × every spelling, 1864–1901), §2 and §5
 * for Griffith's Valuation and the census townlands, §5–§6 for the 1870
 * Dublin diocesan marriage-licence bond. Each detail names the one thing a
 * human must read; the finding itself gets written on the site, where the
 * family shares it.
 *
 * Seeded by src/lib/seed-checklist.ts. Keys are stable row identities — never
 * edit one that has shipped, or the row loses its recorded reading.
 */

export interface JunctionChecklistRecord {
  /** Stable seed key: the idempotency key for `checklist_items.key`. */
  key: string;
  section: string;
  title: string;
  detail: string;
  url: string | null;
}

export const SECTION_DEATH_REGISTERS = "Death registers";
export const SECTION_LAND = "Land records";
export const SECTION_CHURCH = "Church records";
export const SECTION_CENSUS = "Census";

/** Every spelling the memo tried for the surname, for the search instructions. */
export const MACARTNEY_SPELLINGS = [
  "Macartney",
  "McCartney",
  "McArtney",
  "MacCartney",
  "McCartny",
  "Macartny",
] as const;

export function junctionChecklist(): JunctionChecklistRecord[] {
  const readOccupationAndPlace =
    "Read the occupation column (farmer vs labourer) and the place of death — one hit puts Henry on a map, and five misses is a real negative.";
  return [
    {
      key: "death-1873-belfast",
      section: SECTION_DEATH_REGISTERS,
      title: "Macartney — Belfast, 1873 (age 89)",
      detail: `Civil death register, Belfast district, 1873. ${readOccupationAndPlace}`,
      url: "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1873/020700/7263015.pdf",
    },
    {
      key: "death-1873-newry",
      section: SECTION_DEATH_REGISTERS,
      title: "McCartney — Newry, Co. Down, 1873 (age 62)",
      detail: `Civil death register, Newry district, 1873. No register image is online yet — get one first. ${readOccupationAndPlace}`,
      url: null,
    },
    {
      key: "death-1883-lurgan",
      section: SECTION_DEATH_REGISTERS,
      title: "McArtney — Lurgan, Co. Armagh, 1883 (age 86)",
      detail: `Civil death register, Lurgan district, 1883. ${readOccupationAndPlace}`,
      url: "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1883/06379/4831023.pdf",
    },
    {
      key: "death-1889-belfast",
      section: SECTION_DEATH_REGISTERS,
      title: "Macartney — Belfast, 1889 (age 65)",
      detail: `Civil death register, Belfast district, 1889. No register image is online yet — get one first. ${readOccupationAndPlace}`,
      url: null,
    },
    {
      key: "death-1892-larne",
      section: SECTION_DEATH_REGISTERS,
      title: "McArtney — Larne, Co. Antrim, 1892 (age 86)",
      detail: `Civil death register, Larne district, 1892. ${readOccupationAndPlace}`,
      url: "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1892/06050/4723989.pdf",
    },
    {
      key: "griffiths-valuation",
      section: SECTION_LAND,
      title: "Griffith's Valuation — every spelling, Antrim then Down",
      detail:
        "Askaboutireland.ie refuses automated requests, so this needs a human browser session. " +
        `Search ${MACARTNEY_SPELLINGS.join(", ")} across Co. Antrim then Co. Down — ` +
        "the first source that would list a Henry Macartney holding land. Record the townland and the spelling you found him under.",
      url: "https://www.askaboutireland.ie/griffith-valuation/",
    },
    {
      key: "dublin-bond-1870",
      section: SECTION_CHURCH,
      title: "Dublin diocesan marriage-licence bond, 1870 — St Mark's marriage",
      detail:
        "Not online anywhere free: it survives in the RCBL / National Archives (Dublin diocese), so this needs an archive visit or order. " +
        "It names the groom's parish — the cleanest single key to where the family came from. Record the parish and every name on the bond.",
      url: null,
    },
    {
      key: "census-1901-1911",
      section: SECTION_CENSUS,
      title: "1901 & 1911 census — Macartney farming households in the will-calendar townlands",
      detail:
        "Retry when census.nationalarchives.ie answers (it timed out from the research machine). " +
        "Look for Macartney farming households in the townlands the will calendars name — Down: Cabra, Granshaw, Ballyhanwood, Lisnod, Ballymacreely, Ballyailley, Ballylesson; " +
        "Antrim: Derriaghy, Ballydonaghy, Aughnamillan, Boltnaconnell — then record the households with ages.",
      url: "https://www.census.nationalarchives.ie/search/",
    },
  ];
}
