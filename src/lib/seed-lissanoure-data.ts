/**
 * The documented Macartneys of Lissanoure, Co. Antrim — the speculative line
 * that sits beside the family tree as cluster 'lissanoure'.
 *
 * Why it exists: John's question is whether our Dublin Macartneys (Henry
 * Macartney, farmer → Richard Henry b~1841 → William Henry b1871) are related
 * to George Macartney, 1st Earl Macartney. The honest answer starts with what
 * the sources actually document, so this file carries the DIRECT LINE only —
 * George Macartney, Sheriff of co. Antrim (b.1626), down through Lissanoure to
 * George Travers Lucy Macartney (d.1943), the last of the name — with the
 * sources for every assertion attached to facts, not to prose.
 *
 * Two facts do most of the framing work:
 *   - the Earl died without issue in 1806 (his titles became extinct), so the
 *     estate and the name continued through his sister's line; and
 *   - the male line ended in 1943, so any claim of kinship today is a claim
 *     about a cadet branch or a deeper shared ancestor, not about descent from
 *     the Earl himself.
 *
 * Nothing here is connected to the family tree. `seedLissanoure()` writes these
 * rows into cluster 'lissanoure' and refuses to touch any other cluster; the
 * family-facing reads cannot see them (see src/lib/clusters.ts).
 */

import type { Confidence, FactKind, Sex, SourceKind } from "./types";

export interface LissanoureFact {
  kind: FactKind;
  detail: string;
  source: string;
  sourceUrl: string | null;
  sourceKind: SourceKind;
  confidence: Confidence;
}

export interface LissanourePerson {
  /** Stable key for unions/children in this file — never stored. */
  key: string;
  fullName: string;
  aliases?: string[];
  sex: Sex;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  notes: string | null;
  facts: LissanoureFact[];
}

export interface LissanoureUnion {
  a: string;
  b: string | null;
  marriageDate: string | null;
  marriagePlace: string | null;
}

/** { union: index into lissanoureUnions(), child: person key } */
export interface LissanoureChild {
  union: number;
  child: string;
}

const STIRNET =
  "Lodge, Peerage of Ireland vol. VII (1789), 'Macartney, Lord Macartney', and Burke's Landed Gentry of Ireland 1912, 'Macartney of Lissanoure' — as transcribed by Stirnet";
const STIRNET_URL = "https://www.stirnet.com/genie/data/british/mac/macartney1.php";
const GLENS = "Glens of Antrim Historical Society, 'The Macartney's of Lissanoure'";
const GLENS_URL = "https://antrimhistory.net/the-macartneys-of-lissanoure/";
const BURKES_1879 = "Burke's Genealogical and Heraldic History (1879), 'Macartney of Lissanoure'";
const BURKES_1879_URL =
  "https://archive.org/stream/genealogical02burk1879/genealogical02burk1879_djvu.txt";
const WIKI_EARL =
  "Wikipedia, 'George Macartney, 1st Earl Macartney' (drawing on Chisholm, Encyclopaedia Britannica 1911)";
const WIKI_EARL_URL = "https://en.wikipedia.org/wiki/George_Macartney,_1st_Earl_Macartney";

function f(
  kind: FactKind,
  detail: string,
  source: string,
  sourceUrl: string | null,
  sourceKind: SourceKind = "secondary",
  confidence: Confidence = "documented",
): LissanoureFact {
  return { kind, detail, source, sourceUrl, sourceKind, confidence };
}

export function lissanourePeople(): LissanourePerson[] {
  return [
    {
      key: "george-1626",
      fullName: "George Macartney, Sheriff of co. Antrim",
      sex: "m",
      birthDate: "1626",
      birthPlace: "Auchinleck, Kirkcudbrightshire, Scotland",
      deathDate: null,
      deathPlace: null,
      notes:
        "The family's Irish point of arrival. Left Auchinleck for Co. Antrim in 1649; settled in Belfast, where he prospered and became Sovereign (mayor); Surveyor General for Ulster and Sheriff of co. Antrim. Married Jane Calderwood, then Elizabeth Butler. Lodge prints a tradition that the family went from Ireland to Scotland in the 14th century and was granted lands in Argyll for service under Robert the Bruce — a tradition, not a document, and the boundary of what this line claims.",
      facts: [
        f("birth", "b. 1626", STIRNET, STIRNET_URL),
        f("occupation", "Surveyor General for Ulster; Sheriff of co. Antrim", STIRNET, STIRNET_URL),
        f(
          "residence",
          "Left Auchinleck, Kirkcudbrightshire for Co. Antrim in 1649; Sovereign (mayor) of Belfast",
          GLENS,
          GLENS_URL,
        ),
        f(
          "note",
          "Family origin tradition reported by Lodge/Archdall: Daniel MacCarthy/MacCartney went from Ireland into Scotland; his son Donough served Robert the Bruce and was granted lands in Argyll (1318). The three branches — Leathes, Auchinleck, Blacket — all claim this descent. Tradition only; no document survives for it.",
          STIRNET,
          STIRNET_URL,
          "secondary",
          "likely",
        ),
      ],
    },
    {
      key: "jane-calderwood",
      fullName: "Jane Calderwood",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes: "Daughter of St. Quintin Calderwood of Belfast. First wife of George Macartney, Sheriff of co. Antrim.",
      facts: [
        f("marriage", "First wife of George Macartney, Sheriff of co. Antrim", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "george-1671",
      fullName: "George Macartney of Lissanoure",
      sex: "m",
      birthDate: "1671-02-07",
      birthPlace: "Belfast, Co. Antrim",
      deathDate: "1757-10-17",
      deathPlace: null,
      notes:
        "The man who bought Lissanoure: 6,146 acres in 8 townlands from the O'Hara family for £5,985 in 1733, plus the Dervock estate (7 townlands, 2,189 acres) from the Hon. John Skeffington for £7,205 in 1741 — within eight years one of the biggest landowners in Co. Antrim. Colonel and MP for Belfast; the plaque in All Saints' Church, Loughgiel records him as 'the oldest member of the House of Commons, having sat in Parliament upward of 54 years'. Stirnet/Lodge show him as a son of George (b.1626); the Glens of Antrim history calls him one of that George's four sons.",
      facts: [
        f("birth", "b. 7 Feb 1671", STIRNET, STIRNET_URL),
        f("death", "d. 17 Oct 1757", STIRNET, STIRNET_URL),
        f("occupation", "Colonel; MP for Belfast; upwards of 54 years in Parliament", GLENS, GLENS_URL),
        f(
          "residence",
          "Bought 6,146 acres at Lissanoure in 8 townlands from the O'Hara family for £5,985 in 1733",
          GLENS,
          GLENS_URL,
        ),
        f(
          "residence",
          "Bought the Dervock estate (2,189 acres, 7 townlands) from the Hon. John Skeffington for £7,205 in 1741",
          GLENS,
          GLENS_URL,
        ),
        f(
          "marriage",
          "m1 (1700) Letitia Porter (d.1721), daughter and coheir of Sir Charles Porter, Lord High Chancellor of Ireland; m2 Elizabeth Dobbyn, widow of Robert South of Vallycaston",
          STIRNET,
          STIRNET_URL,
        ),
      ],
    },
    {
      key: "letitia-porter",
      fullName: "Letitia Porter",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: "1721",
      deathPlace: null,
      notes:
        "Daughter and coheir of Sir Charles Porter, Lord High Chancellor of Ireland. Married George Macartney of Lissanoure in 1700; mother of George (d.1778) and the other children of the first marriage.",
      facts: [
        f("death", "d. 1721", STIRNET, STIRNET_URL),
        f("marriage", "m. 1700 George Macartney of Lissanoure", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "george-1778",
      fullName: "George Macartney of Lissanoure",
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: "1778-01",
      deathPlace: null,
      notes:
        "Second son of George Macartney of Lissanoure (b.1671) by Letitia Porter; father of the 1st Earl. His son was the only male child of his generation, which is why both the Lissanoure and Dervock estates passed to the Earl.",
      facts: [
        f("death", "d. Jan 1778", STIRNET, STIRNET_URL),
        f("marriage", "m. 1732 Elizabeth Winder", STIRNET, STIRNET_URL),
        f(
          "note",
          "His son was the only male child of his generation and so succeeded to the Lissanoure and Dervock estates (the Glens of Antrim history calls him 'a fourth George')",
          GLENS,
          GLENS_URL,
        ),
      ],
    },
    {
      key: "elizabeth-winder",
      fullName: "Elizabeth Winder",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: "1755-07",
      deathPlace: null,
      notes: "Daughter of Rev. John Winder of Carmony. Married George Macartney of Lissanoure in 1732; mother of the 1st Earl Macartney.",
      facts: [
        f("death", "d. July 1755", STIRNET, STIRNET_URL),
        f("marriage", "m. 1732 George Macartney of Lissanoure (d.1778)", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "earl",
      fullName: "George Macartney, 1st Earl Macartney",
      aliases: ["Lord Macartney"],
      sex: "m",
      birthDate: "1737-05-14",
      birthPlace: "Loughguile, Co. Antrim, Ireland",
      deathDate: "1806-05-31",
      deathPlace: "Chiswick, Middlesex, England",
      notes:
        "The man this cluster exists for. Only son of George Macartney of Lissanoure (d.1778) and Elizabeth Winder. Trinity College Dublin; envoy extraordinary to Russia 1764–66; MP for Armagh Borough and Chief Secretary for Ireland 1768; Governor of Grenada 1776–79 (taken prisoner by the French, 1779); Governor of Madras 1781–85 (Treaty of Mangalore, 1784); led the Macartney embassy to China 1793–94; Governor of the Cape Colony 1797–98. Created Baron Macartney (1776) and Viscount/Earl Macartney in the Irish peerage, then Baron Macartney of Parkhurst and Auchinleck in the British peerage (1796). Died without issue, so the titles became extinct and — after his widow's life interest — the estate passed to his niece's line.",
      facts: [
        f("birth", "b. 14 May 1737, Loughguile (Lissanoure), Co. Antrim", WIKI_EARL, WIKI_EARL_URL),
        f(
          "death",
          "d. 31 May 1806 at Chiswick, Middlesex; died without issue, the title becoming extinct",
          WIKI_EARL,
          WIKI_EARL_URL,
        ),
        f(
          "note",
          "CONFLICT, recorded not resolved: Wikipedia gives the death as 31 May 1806; the Glens of Antrim history and Stirnet both give 31 March 1806. Both dates are kept in this cluster rather than one being silently preferred.",
          GLENS,
          GLENS_URL,
        ),
        f(
          "note",
          "Death without issue is the load-bearing negative for the whole question: 'he left his wife, the Countess, a life-interest in the estate. The heir was his sister's daughter, Elizabeth Belaguier, who married the Rev. Dr. Travers Hume.'",
          GLENS,
          GLENS_URL,
        ),
        f("marriage", "m. 1 Feb 1768 Lady Jane Stuart, daughter of the 3rd Earl of Bute", STIRNET, STIRNET_URL),
        f(
          "occupation",
          "Governor of Grenada 1776–79; Governor of Madras 1781–85; Governor of the Cape Colony 1797–98; first British ambassador to China 1793",
          WIKI_EARL,
          WIKI_EARL_URL,
        ),
        f(
          "note",
          "Died without issue; after his widow's death his property passed to his niece, whose son took the name",
          WIKI_EARL,
          WIKI_EARL_URL,
        ),
      ],
    },
    {
      key: "jane-stuart",
      fullName: "Lady Jane Stuart",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes:
        "Daughter of John Stuart, 3rd Earl of Bute; married the 1st Earl Macartney on 1 Feb 1768. Held a life interest in the Lissanoure estate after his death; she outlived the heir, Elizabeth Blaquier, which is how the estate reached Elizabeth's son George Hume in 1828.",
      facts: [
        f("marriage", "m. 1 Feb 1768 George Macartney, 1st Earl Macartney", STIRNET, STIRNET_URL),
        f(
          "note",
          "Left a life interest in the estate by the Earl; Elizabeth Blaquier, the heir, died before the Countess, so the estate passed to Elizabeth's son George Hume in 1828",
          GLENS,
          GLENS_URL,
        ),
      ],
    },
    {
      key: "elizabeth-macartney",
      fullName: "Elizabeth Macartney",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: "1782",
      deathPlace: null,
      notes:
        "Sister of the 1st Earl (daughter of George Macartney of Lissanoure and Elizabeth Winder). Her daughter Elizabeth Blaquier became the Earl's heiress — Lissanoure descends through this line, not through the Earl.",
      facts: [
        f("death", "d. 1782", STIRNET, STIRNET_URL),
        f("marriage", "m. 1759 John Belaguier (Blaquier), Major", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "john-belaguier",
      fullName: "John Belaguier (Blaquier)",
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: "1760-05",
      deathPlace: null,
      notes: "Major; married Elizabeth Macartney, sister of the 1st Earl, in 1759.",
      facts: [
        f("death", "d. May 1760", STIRNET, STIRNET_URL),
        f("military", "Major", STIRNET, STIRNET_URL),
        f("marriage", "m. 1759 Elizabeth Macartney", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "elizabeth-blaquier",
      fullName: "Elizabeth Blaquier",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes:
        "Daughter of Major John Blaquier and Elizabeth Macartney; niece of the 1st Earl Macartney and his heiress (the Glens of Antrim history spells the family Belaguier). Married the Rev. Dr Travers Hume but died before the Countess's life interest ended, so the estate passed to her son George Hume, who took the name Macartney.",
      facts: [
        f(
          "note",
          "Heiress of the 1st Earl Macartney (his sister's daughter); died before the Countess, so the estate passed to her son George Hume",
          GLENS,
          GLENS_URL,
        ),
        f("marriage", "m. 1787 Rev. Travers Hume", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "travers-hume",
      fullName: "Rev. Dr Travers Hume",
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      notes:
        "Church of Ireland clergyman, son of Gustavus Hume of Dublin (state surgeon); married Elizabeth Blaquier in 1787. Their son took the name Macartney of Lissanoure.",
      facts: [
        f("occupation", "Church of Ireland clergyman (Rev. Dr)", GLENS, GLENS_URL),
        f("marriage", "m. 1787 Elizabeth Blaquier", STIRNET, STIRNET_URL),
        f(
          "residence",
          "Son of Gustavus Hume of Dublin, state surgeon, by his wife née Travers",
          STIRNET,
          STIRNET_URL,
        ),
      ],
    },
    {
      key: "george-hume-macartney",
      fullName: "George Hume Macartney of Lissanoure",
      aliases: ["George Hume"],
      sex: "m",
      birthDate: "1793-10",
      birthPlace: null,
      deathDate: "1869-10-20",
      deathPlace: null,
      notes:
        "'The Old Squire' to his face, 'the old Tyrant' behind his back. Took the name Macartney and became lord of the manor of Lissanoure in 1828 when his mother died before the Countess's life interest ended. In 1837 he evicted the Loughgiel Roman Catholics from their chapel on the estate and replaced it with All Saints Church of Ireland church (consecrated c.1848); he built the Dervock church too, and lost the Dervock fair-toll case to Daniel O'Connell. Deputy County Grand Master of the Co. Antrim Orangemen. The castle was destroyed by a gunpowder explosion on 5 October 1847 — it killed his wife and the family then lived at the cottage; the castle stayed a ruin, only the yard intact.",
      facts: [
        f("birth", "b. Oct 1793", STIRNET, STIRNET_URL),
        f("death", "d. 20 Oct 1869", STIRNET, STIRNET_URL),
        f("occupation", "MP", STIRNET, STIRNET_URL),
        f("marriage", "m. (May 1828) Ellen Filgate, daughter and heir of Townley Patten Filgate of Lowtherstone", STIRNET, STIRNET_URL),
        f("residence", "Lord of the manor of Lissanoure from 1828", GLENS, GLENS_URL),
        f(
          "note",
          "Evicted the Loughgiel Roman Catholics from the chapel on the estate in 1837 and built All Saints Church of Ireland church in its place (consecrated c.1848); built the Dervock church; lost the Dervock fair-toll case to Daniel O'Connell",
          GLENS,
          GLENS_URL,
        ),
        f(
          "note",
          "The castle was destroyed by a gunpowder explosion on 5 October 1847, killing his wife; the family then lived at the cottage and the castle remained a ruin",
          GLENS,
          GLENS_URL,
        ),
      ],
    },
    {
      key: "ellen-filgate",
      fullName: "Ellen Filgate",
      sex: "f",
      birthDate: null,
      birthPlace: null,
      deathDate: "1847",
      deathPlace: "Lissanoure Castle, Co. Antrim",
      notes:
        "Daughter and heir of Townley Patten Filgate of Lowtherstone; married George Hume Macartney in May 1828. Killed in the Lissanoure Castle gunpowder explosion on 5 October 1847.",
      facts: [
        f("death", "d. 1847 — killed in the castle explosion of 5 Oct 1847", GLENS, GLENS_URL),
        f("marriage", "m. May 1828 George Hume Macartney", STIRNET, STIRNET_URL),
      ],
    },
    {
      key: "george-travers",
      fullName: "Captain George Travers Macartney of Lissanoure",
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: "1874-08-29",
      deathPlace: null,
      notes:
        "Eldest son of George Hume Macartney; former captain in the 15th King's Hussars. Walked the estate, talked to the workers and paid generous compensation for tenants' improvements — the people of Dervock erected a fountain in his memory. Died suddenly of a heart attack on 29 August 1874, aged 44, leaving a wife and four small children.",
      facts: [
        f("death", "d. 29 Aug 1874, aged 44 (heart attack)", GLENS, GLENS_URL),
        f("military", "Captain, 15th King's Hussars", GLENS, GLENS_URL),
        f("note", "Dervock erected a fountain beside the bridge in his memory", GLENS, GLENS_URL),
      ],
    },
    {
      key: "carthanach",
      fullName: "Carthanach George Macartney of Lissanoure",
      sex: "m",
      birthDate: "1869-08-11",
      birthPlace: null,
      deathDate: "1936",
      deathPlace: null,
      notes:
        "Succeeded as a child of five in 1874 and was landlord of Lissanoure and Dervock for 62 years — a record among Irish gentry. Saw the estate broken up under the Land Acts, by which his tenantry became owner-occupiers; he was left only with the land around his home, which he farmed.",
      facts: [
        f("birth", "b. 11 Aug 1869", BURKES_1879, BURKES_1879_URL),
        f(
          "note",
          "Burke's (1879): 'Macartney, Carthanach George, Esq. of Lissanoure, co. Antrim, b. 11 Aug. 1869, s. his father 29 Aug. 1874'",
          BURKES_1879,
          BURKES_1879_URL,
        ),
        f("death", "d. 1936", GLENS, GLENS_URL),
        f(
          "residence",
          "Landlord of Lissanoure and Dervock for 62 years; the estate was broken up under the Land Acts and sold to the tenantry",
          GLENS,
          GLENS_URL,
        ),
      ],
    },
    {
      key: "george-travers-lucy",
      fullName: "George Travers Lucy Macartney",
      sex: "m",
      birthDate: null,
      birthPlace: null,
      deathDate: "1943-07-11",
      deathPlace: "Co. Cork",
      notes:
        "Last Macartney of Lissanoure. Eccentric and spendthrift; bought the Torr Head fishery and other schemes with little success. Died on holiday in Co. Cork on 11 July 1943; the estate was sold to the Mackies of Belfast — it had already been requisitioned as a British Army training base, with a German prisoner-of-war camp, and the Mackies did not get full possession until 1945. His death ends the documented male line, so a claim of kinship today can only mean a cadet branch or a shared deeper ancestor.",
      facts: [
        f(
          "death",
          "d. 11 July 1943 on holiday in Co. Cork — the last Macartney of Lissanoure",
          GLENS,
          GLENS_URL,
        ),
        f("residence", "Lissanoure estate sold to the Mackies of Belfast (full possession 1945)", GLENS, GLENS_URL),
      ],
    },
  ];
}

/**
 * The direct line as couples. partner_b null is a real state in kin (an open
 * partner slot), used here where the source does not name a wife.
 */
export function lissanoureUnions(): LissanoureUnion[] {
  return [
    { a: "george-1626", b: "jane-calderwood", marriageDate: null, marriagePlace: null },
    { a: "george-1671", b: "letitia-porter", marriageDate: "1700", marriagePlace: null },
    { a: "george-1778", b: "elizabeth-winder", marriageDate: "1732", marriagePlace: null },
    { a: "earl", b: "jane-stuart", marriageDate: "1 Feb 1768", marriagePlace: null },
    { a: "elizabeth-macartney", b: "john-belaguier", marriageDate: "1759", marriagePlace: null },
    { a: "elizabeth-blaquier", b: "travers-hume", marriageDate: "1787", marriagePlace: null },
    {
      a: "george-hume-macartney",
      b: "ellen-filgate",
      marriageDate: "May 1828",
      marriagePlace: null,
    },
    // Two wives are not named by the sources we hold: the 1874 captain's
    // ("leaving a wife and four small children") and Carthanach's.
    { a: "george-travers", b: null, marriageDate: null, marriagePlace: null },
    { a: "carthanach", b: null, marriageDate: null, marriagePlace: null },
  ];
}

export function lissanoureChildren(): LissanoureChild[] {
  return [
    { union: 0, child: "george-1671" },
    { union: 1, child: "george-1778" },
    { union: 2, child: "earl" },
    { union: 2, child: "elizabeth-macartney" },
    { union: 4, child: "elizabeth-blaquier" },
    { union: 5, child: "george-hume-macartney" },
    { union: 6, child: "george-travers" },
    { union: 7, child: "carthanach" },
    { union: 8, child: "george-travers-lucy" },
  ];
}
