/**
 * Two Macartney lines, side by side — the data behind /compare.
 *
 * John's question is whether the Dublin Macartneys (Henry, farmer → Richard
 * Henry b.~1841 → William Henry b.1871) descend from the documented Macartneys
 * of Lissanoure, Co. Antrim — the family of George Macartney, 1st Earl
 * Macartney (1737–1806). This module holds the answer as data, not prose:
 *
 *   - `lissanoureLine` — the documented Antrim line, back to the 1522 marriage
 *     recorded in the Auchinleck pedigree, and forward through the Earl (dsp
 *     1806) to the last of the name in 1943.
 *   - `familyLine` — our line, from the earliest placeable ancestor (Henry,
 *     farmer, a *candidate* at Cromkill) to the six Dublin siblings.
 *   - `parishLane` — same-surname households in Connor/Kells at the same dates.
 *     Context, never ancestors; every entry is evidence "context".
 *   - `henryCandidates` — the four Henry Macartney/McCartney entries in
 *     Griffith's Valuation 1848–64, with the fit of each.
 *
 * The rule this file keeps: a person enters `lissanoureLine` only with a
 * printed pedigree behind them, and enters `familyLine` only if a record names
 * them in our family. Henry is the single exception, and his entry says
 * "candidate" in the data and on the page. No row claims a link.
 *
 * Sources are URLs, not just labels, so every cell can be checked. Records
 * consulted while building this and found wanting are listed in
 * docs/macartney-lines-2026-10-25.md, not silently dropped.
 */

export type Evidence = "documented" | "pedigree" | "candidate" | "context";

export interface LineSource {
  label: string;
  url: string;
}

export interface LineEntry {
  key: string;
  name: string;
  dates: string;
  place: string;
  role: string;
  evidence: Evidence;
  note: string;
  sources: LineSource[];
}

export interface TimelineRow {
  era: string;
  sortYear: number;
  /** Keys in lissanoureLine(). */
  lissanoure: string[];
  /** Keys in familyLine(). */
  family: string[];
  /** Keys in parishLane(). */
  parish: string[];
}

export interface HenryCandidate {
  key: string;
  name: string;
  record: string;
  county: string;
  parish: string;
  townland: string;
  setting: "rural" | "urban";
  fit: "best" | "possible" | "weak";
  note: string;
  source: LineSource;
}

export interface Reason {
  title: string;
  detail: string;
}

export interface NextRecord {
  record: string;
  gives: string;
  where: string;
  url: string | null;
}

/* ------------------------------------------------------------------ sources */

const STIRNET: LineSource = {
  label: "Stirnet, MacCartney of Auchinleck / Macartney of Lissanoure",
  url: "https://www.stirnet.com/genie/data/british/mac/macartney1.php",
};
const DIB_1626: LineSource = {
  label: "Dictionary of Irish Biography, George Macartney (1626–91)",
  url: "https://www.dib.ie/biography/macartney-mccartney-george-a5099",
};
const DIB_EARL: LineSource = {
  label: "Dictionary of Irish Biography, George Macartney, 1st Earl Macartney",
  url: "https://www.dib.ie/biography/macartney-george-a5101",
};
const GLENS: LineSource = {
  label: "Glens of Antrim Historical Society, 'The Macartneys of Lissanoure'",
  url: "https://antrimhistory.net/the-macartneys-of-lissanoure/",
};
const WIKI_EARL: LineSource = {
  label: "Wikipedia, 'George Macartney, 1st Earl Macartney'",
  url: "https://en.wikipedia.org/wiki/George_Macartney,_1st_Earl_Macartney",
};
const HOP: LineSource = {
  label: "History of Parliament, Sir George Macartney (1737–1806)",
  url: "https://www.historyofparliamentonline.org/volume/1754-1790/member/macartney-sir-george-1737-1806",
};
const BURKES: LineSource = {
  label: "Burke's Genealogical and Heraldic History (1879), Macartney of Lissanoure",
  url: "https://archive.org/stream/genealogical02burk1879/genealogical02burk1879_djvu.txt",
};
const BELMONT: LineSource = {
  label: "Lord Belmont in Northern Ireland, 'Macartney of Lissanoure'",
  url: "http://lordbelmontinnorthernireland.blogspot.com/2017/09/macartney-of-lissanoure.html",
};
const GV_HENRY_MAC: LineSource = {
  label: "Griffith's Valuation index — search 'Henry Macartney'",
  url: "https://app.irishroots.ie/griffiths?q=Henry%20Macartney",
};
const GV_HENRY_MC: LineSource = {
  label: "Griffith's Valuation index — search 'Henry McCartney'",
  url: "https://app.irishroots.ie/griffiths?q=Henry%20McCartney",
};
const GV_CONNOR: LineSource = {
  label: "Griffith's Valuation, Connor parish, Co. Antrim (transcription)",
  url: "https://www.irishgenealogyhub.com/antrim/griffiths-valuation/parish-of-connor.php",
};
const CROMKILL: LineSource = {
  label: "Irish Roots, Cromkill townland (Griffith's, Tithe and census records)",
  url: "https://app.irishroots.ie/county/antrim/townland/cromkill-49339",
};
const TITHE_CONNOR: LineSource = {
  label: "Tithe Applotment Books 1823–38, Connor parish, Co. Antrim (transcription)",
  url: "https://www.irishgenealogyhub.com/antrim/tithe-applotments/connor-parish.php",
};
const CRAPPAGH: LineSource = {
  label: "Irish Roots, Crappagh townland, Aghabog, Co. Monaghan",
  url: "https://app.irishroots.ie/county/monaghan/townland/crappagh-17217",
};
const CENSUS_1901_DUBLIN: LineSource = {
  label: "1901 census index — Macartney, Co. Dublin (National Archives)",
  url: "https://api-census.nationalarchives.ie/census/query?census_year=1901&county=Dublin&surname__icontains=Macartney",
};
const CENSUS_1911_DUBLIN: LineSource = {
  label: "1911 census index — Macartney, Co. Dublin (National Archives)",
  url: "https://api-census.nationalarchives.ie/census/query?census_year=1911&county=Dublin&surname__icontains=Macartney",
};
const CENSUS_CROMKILL: LineSource = {
  label: "1901 and 1911 census — Cromkill, Connor, Co. Antrim",
  url: "https://api-census.nationalarchives.ie/census/query?census_year=1901&county=Antrim&townland__icontains=Cromkill&surname__icontains=Macartney",
};
const HMR_1669: LineSource = {
  label: "1669 Hearth Money Rolls, Co. Antrim (Bill MacAfee's transcript)",
  url: "https://www.billmacafee.com/1660shearthmoneyrolls/1669hearthmoneyrollsantrim.xls",
};
const RETURNS_1740: LineSource = {
  label: "1740 Protestant Householders' Returns, Co. Antrim (Bill MacAfee's transcript)",
  url: "https://www.billmacafee.com/1740returns/1740protestantreturnsantrim.xls",
};
const FLAX_1796: LineSource = {
  label: "1796 Spinning Wheel Premium / flax growers, Co. Antrim (Bill MacAfee's transcript)",
  url: "https://www.billmacafee.com/1796flaxgrowerslist/1796flaxgrowersantrim.xls",
};
const MUSTER_1630: LineSource = {
  label: "1630 Muster Rolls, Co. Antrim (Bill MacAfee's transcript)",
  url: "https://www.billmacafee.com/1630musterrolls/1630musterrollsantrim.xls",
};
const MARRIAGE_1870: LineSource = {
  label: "Civil marriage register, Richard Henry Macartney × Dora Dunne, 6 Sep 1870",
  url: "https://www.irishgenealogy.ie/view?record_id=cima-2720627",
};
const MARRIAGE_1896: LineSource = {
  label: "Civil marriage register, William Henry Macartney × Edith Maud Grainger, 8 Jun 1896",
  url: "https://www.irishgenealogy.ie/view?record_id=cima-2258498",
};
const BIRTH_1871: LineSource = {
  label: "Birth index, William Henry Macartney, Dublin South, 1871",
  url: "https://www.findmypast.co.uk/transcript?id=IRE/BMD/D/568742130",
};
const BIRTH_1881_MABEL: LineSource = {
  label: "Birth register, Mabel Macartney, 18 Aug 1881, Dublin South",
  url: "https://www.irishgenealogy.ie/view?record_id=cibi-9034873",
};
const DEATH_1884: LineSource = {
  label: "Civil death register, Richard Macartney, Dublin South, 1884 (age 43)",
  url: "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1884/06337/4817380.pdf",
};
const PRONI_PAPERS: LineSource = {
  label: "PRONI, Macartney Papers (D572, D1062/2, D2225, D2731)",
  url: "https://www.proni.gov.uk/publications/html-document/index-significant-private-deposits",
};
const NLI_LISSANOURE: LineSource = {
  label: "NLI catalogue, memorandum book of Lord Macartney's Lissanoure estate, 1790",
  url: "https://sources.nli.ie/Record/MS_UR_045806/Details?lng=ga",
};

/* ---------------------------------------------------------- Lissanoure line */

export function lissanoureLine(): LineEntry[] {
  return [
    {
      key: "george-1522",
      name: "George MacCartney",
      dates: "m. 1522",
      place: "Auchinleck, Kirkcudbrightshire, Scotland",
      role: "Founder of the recorded Auchinleck line",
      evidence: "pedigree",
      note: "Married Margaret MacCulloch of Fleetbank. The generations above him are Lodge's fourteenth-century MacCarthy tradition, not a record — the pedigree begins here.",
      sources: [STIRNET, BELMONT],
    },
    {
      key: "patrick-1593",
      name: "Patrick MacCartney of Auchinleck",
      dates: "fl. 1593",
      place: "Auchinleck, Kirkcudbrightshire",
      role: "Laird",
      evidence: "pedigree",
      note: "Married Jane MacLellan. Stirnet warns that Lodge may have made the next Bartholomew Patrick's eldest brother rather than his son; that one generation is not secure.",
      sources: [STIRNET],
    },
    {
      key: "bartholomew-1587",
      name: "Bartholomew MacCartney of Auchinleck",
      dates: "m. 1587",
      place: "Auchinleck, Kirkcudbrightshire",
      role: "Laird",
      evidence: "pedigree",
      note: "Married Mary Stewart, daughter of John Stewart of Auchinleck.",
      sources: [STIRNET],
    },
    {
      key: "bartholomew-dvp",
      name: "Bartholomew MacCartney",
      dates: "d.v.p. before 1626",
      place: "Auchinleck, Kirkcudbrightshire",
      role: "Heir who predeceased his father",
      evidence: "pedigree",
      note: "Married Catherine Maxwell of Orchardton. The Dictionary of Irish Biography names him as father of the 1626 George; Stirnet agrees.",
      sources: [STIRNET, DIB_1626],
    },
    {
      key: "george-1626",
      name: "George Macartney, Sheriff of co. Antrim",
      dates: "1626 – c.1689",
      place: "Auchinleck → Belfast, Co. Antrim (1649)",
      role: "Merchant; Surveyor General for Ulster; Sheriff of Antrim",
      evidence: "documented",
      note: "The family's Irish point of arrival. Left Auchinleck for Belfast in 1649, prospered, became Sovereign (mayor), and married Jane Calderwood. His eldest son James became a judge in Dublin and London.",
      sources: [STIRNET, DIB_1626, GLENS, BELMONT],
    },
    {
      key: "james-1651",
      name: "James Macartney of Auchinleck",
      dates: "1651 – 16 Dec 1727",
      place: "Dublin, then London",
      role: "Judge; MP",
      evidence: "pedigree",
      note: "Eldest son of the Sheriff. Stirnet places him in Dublin before London. His male line failed in grand-daughters, so the Lissanoure succession did not pass through him.",
      sources: [STIRNET, DIB_1626],
    },
    {
      key: "george-1671",
      name: "George Macartney of Lissanoure",
      dates: "7 Feb 1671 – 17 Oct 1757",
      place: "Belfast → Lissanoure, Co. Antrim",
      role: "Colonel; MP for Belfast",
      evidence: "documented",
      note: "Bought Lissanoure in 1733 and Dervock in 1741 — one of the largest landowners in Co. Antrim. Sat in Parliament for over 54 years.",
      sources: [STIRNET, GLENS],
    },
    {
      key: "george-1778",
      name: "George Macartney of Lissanoure",
      dates: "d. Jan 1778 (DIB: 1779)",
      place: "Lissanoure, Co. Antrim",
      role: "Landowner",
      evidence: "documented",
      note: "Father of the Earl. The death year is a real source conflict — 1778 in Stirnet and Lord Belmont, 1779 in the Dictionary of Irish Biography.",
      sources: [STIRNET, DIB_EARL, BELMONT],
    },
    {
      key: "earl",
      name: "George Macartney, 1st Earl Macartney",
      dates: "1737 – 1806",
      place: "Loughguile, Co. Antrim; died Chiswick, Middlesex",
      role: "Diplomat; Governor of Grenada, Madras and the Cape; first British ambassador to China",
      evidence: "documented",
      note: "Only son of George of Lissanoure and Elizabeth Winder. Died without issue in 1806, so his titles became extinct and the estate passed through his sister's line. Two dates conflict: born 3 May (History of Parliament) or 14 May (Wikipedia); died 31 March (Stirnet, Glens) or 31 May (Wikipedia).",
      sources: [WIKI_EARL, STIRNET, GLENS, HOP],
    },
    {
      key: "elizabeth-macartney",
      name: "Elizabeth Macartney",
      dates: "d. 1782",
      place: "Lissanoure, Co. Antrim",
      role: "The Earl's sister and the surviving line",
      evidence: "documented",
      note: "Married Major John Belaguier (Blaquier) in 1759. Her daughter Elizabeth Blaquier became the Earl's heiress: the estate and the name continued through her, not through the Earl.",
      sources: [STIRNET, GLENS],
    },
    {
      key: "george-hume",
      name: "George Hume Macartney of Lissanoure",
      dates: "Oct 1793 – 20 Oct 1869",
      place: "Lissanoure, Co. Antrim",
      role: "MP; lord of the manor from 1828",
      evidence: "documented",
      note: "Took the Macartney name as heir. Built the Dervock church; the castle was destroyed by a gunpowder explosion in 1847, killing his wife.",
      sources: [STIRNET, GLENS, BURKES],
    },
    {
      key: "carthanach",
      name: "Carthanach George Macartney",
      dates: "11 Aug 1869 – 1936",
      place: "Lissanoure, Co. Antrim",
      role: "Landlord for 62 years",
      evidence: "documented",
      note: "Succeeded as a child of five. Lived to see the estate broken up under the Land Acts and sold to the tenantry.",
      sources: [BURKES, GLENS],
    },
    {
      key: "lucy",
      name: "George Travers Lucy Macartney",
      dates: "d. 11 July 1943",
      place: "Lissanoure; died on holiday in Co. Cork",
      role: "Last Macartney of Lissanoure",
      evidence: "documented",
      note: "His death ends the documented male line. Lissanoure was sold to the Mackies of Belfast. Any kinship claim today is therefore about a cadet branch or a deeper shared ancestor, never descent from the Earl.",
      sources: [GLENS],
    },
  ];
}

/* --------------------------------------------------------------- family line */

export function familyLine(): LineEntry[] {
  return [
    {
      key: "henry",
      name: "Henry Macartney",
      dates: "fl. 1861–1870 (born c.1810–1820?)",
      place: "Cromkill, Connor parish, Co. Antrim — candidate only",
      role: "Farmer",
      evidence: "candidate",
      note: "Named as Richard Henry's father, 'farmer', in the 1870 St Mark's register. No birth, marriage, death or place record survives for him: his marriage predates civil registration, his son's baptism is absent from the digitised registers, and no probate entry exists under any spelling. The only rural Antrim Henry in Griffith's Valuation is at Cromkill, which fits — but no record ties that Henry to Richard Henry. This is the one candidate in the tree.",
      sources: [GV_HENRY_MAC, GV_HENRY_MC, MARRIAGE_1870, CROMKILL],
    },
    {
      key: "richard",
      name: "Richard Henry Macartney",
      dates: "c.1841 – 1884",
      place: "Dublin: 7 Burgh Quay, then Sandymount/Ballsbridge",
      role: "Commissariat assistant? → commercial traveller",
      evidence: "documented",
      note: "Age 43 at death in Dublin South, 1884. Married Dora Dunne on 6 Sep 1870 at St Mark's, by licence; the register names his father as Henry Macartney, farmer. No baptism of any Richard Macartney exists in the digitised church registers 1825–55.",
      sources: [MARRIAGE_1870, DEATH_1884, BIRTH_1881_MABEL],
    },
    {
      key: "william",
      name: "William Henry Macartney",
      dates: "1871 – after 1901",
      place: "Dublin South; Sandymount; Rathmines",
      role: "Inquiry officer → legal journalist",
      evidence: "documented",
      note: "Born 1871, Dublin South. Married Edith Maud Grainger in 1896; the 1901 census records him as a legal journalist at Tritonville Road. He is absent from the 1911 household, where Edith is head — dead, or working away; the census alone cannot say.",
      sources: [BIRTH_1871, MARRIAGE_1896, CENSUS_1901_DUBLIN, CENSUS_1911_DUBLIN],
    },
    {
      key: "six",
      name: "Eileen, Richard, Mabel, Charles, Ruby and Kathleen/Sheila",
      dates: "1896–1907",
      place: "Dublin",
      role: "The six children of William and Edith",
      evidence: "documented",
      note: "Five civil registrations plus Eileen's St James baptism. The 1911 census lists Eileen 14, Richard 13, Mabel 11, Charles 9, Ruby 6 and Sheila 4 (probably Kathleen S), with Edith as head.",
      sources: [CENSUS_1911_DUBLIN, BIRTH_1881_MABEL],
    },
    {
      key: "dora",
      name: "Dora Dunne",
      dates: "c.1846–50 – after 1911",
      place: "Born Co. Limerick; died Dublin",
      role: "Widow; annuity",
      evidence: "documented",
      note: "New from the census: in 1901 Dora is 51, head of her own household at Tritonville Road, an annuitant born in Co. Limerick, Church of Ireland; in 1911 she is 65, living with her son Charles at Arran Quay. Her own ages disagree by four years, so she was born c.1846–50. Her Limerick origin is a fresh lead for the Dunne side.",
      sources: [CENSUS_1901_DUBLIN, CENSUS_1911_DUBLIN],
    },
    {
      key: "charles-snr",
      name: "Charles Macartney",
      dates: "c.1873 – ?",
      place: "Dublin",
      role: "Timekeeper",
      evidence: "documented",
      note: "Dora's son and a brother of William and Mabel, not yet in the tree: 38 in 1911, a timekeeper at Ard-Righ Road, with his mother and sister Mabel in the household.",
      sources: [CENSUS_1911_DUBLIN],
    },
  ];
}

/* --------------------------------------------------------------- parish lane */

/**
 * Same-surname households in the candidate parish. These are NOT ancestors:
 * every one is marked "context" and the page prints that warning above the
 * lane. They exist to show what the surname was doing in Connor/Kells at the
 * same dates — including at the Earl's own time.
 */
export function parishLane(): LineEntry[] {
  return [
    {
      key: "walter-1669",
      name: "Walter McCartney",
      dates: "1669",
      place: "Kells area, Connor parish, Co. Antrim",
      role: "Hearth-money payer",
      evidence: "context",
      note: "The earliest Macartney household found in the candidate parish. A hearth-tax list names a householder, not a family: no wife, children or later descent is recorded.",
      sources: [HMR_1669],
    },
    {
      key: "andrew-john-1740",
      name: "Andrew and John McCartney",
      dates: "1740",
      place: "Ahoghill parish, Toome barony, Co. Antrim",
      role: "Protestant householders",
      evidence: "context",
      note: "The next-door parish. The 1740 returns name householders by parish only, with no townland and no relationships, so they cannot be tied to Walter or to Henry.",
      sources: [RETURNS_1740],
    },
    {
      key: "connor-tithe-1835",
      name: "Mrs, Mr, James and John McCartney",
      dates: "1835",
      place: "Connor, Ballee and Slatt (Slaght), Connor parish",
      role: "Tithe payers",
      evidence: "context",
      note: "The 1835 tithe book for Connor lists four McCartney households — and no Henry. If our Henry was born c.1810–1820 he would have been a young man in 1835, possibly still in his father's household.",
      sources: [TITHE_CONNOR],
    },
    {
      key: "cromkill-gv-1861",
      name: "Henry, Hugh, James, John, William and William Jr",
      dates: "1861",
      place: "Cromkill, Connor parish",
      role: "Land occupiers",
      evidence: "candidate",
      note: "Six McCartney entries in one townland in Griffith's Valuation, and the only rural Antrim Henry in the whole survey. The cluster is a family in all but name; no document says how its members relate.",
      sources: [GV_CONNOR, CROMKILL],
    },
    {
      key: "matthew-1901",
      name: "Matthew Macartney",
      dates: "c.1846 – after 1911",
      place: "Cromkill, Connor parish",
      role: "Farmer",
      evidence: "context",
      note: "Heads a farming household in Cromkill in both censuses: wife Anne and eight children at home in 1901 (five in 1911), including Thomas (National School teacher in 1901) and Sarah (National School teacher and RUI undergraduate by 1911). The family's continuity in the townland is documented; Matthew's father is not named in either census.",
      sources: [CENSUS_CROMKILL, CROMKILL],
    },
  ];
}

/* --------------------------------------------------------------- timeline */

/**
 * The comparison itself: what each line has in the same window. An empty
 * family cell is the finding, not a rendering bug — it is where the records
 * stop. Keys resolve against the three lists above.
 */
export function timeline(): TimelineRow[] {
  return [
    {
      era: "1522–1593",
      sortYear: 1522,
      lissanoure: ["george-1522", "patrick-1593", "bartholomew-1587"],
      family: [],
      parish: [],
    },
    {
      era: "1626–1689",
      sortYear: 1626,
      lissanoure: ["bartholomew-dvp", "george-1626", "james-1651"],
      family: [],
      parish: ["walter-1669"],
    },
    {
      era: "1671–1757",
      sortYear: 1671,
      lissanoure: ["george-1671"],
      family: [],
      parish: ["andrew-john-1740"],
    },
    {
      era: "1737–1806",
      sortYear: 1737,
      lissanoure: ["george-1778", "earl", "elizabeth-macartney"],
      family: [],
      parish: [],
    },
    {
      era: "1835–1869",
      sortYear: 1835,
      lissanoure: ["george-hume"],
      family: ["henry"],
      parish: ["connor-tithe-1835", "cromkill-gv-1861"],
    },
    {
      era: "1870–1884",
      sortYear: 1870,
      lissanoure: ["carthanach"],
      family: ["richard"],
      parish: [],
    },
    {
      era: "1896–1911",
      sortYear: 1896,
      lissanoure: ["carthanach"],
      family: ["william", "six", "dora", "charles-snr"],
      parish: ["matthew-1901"],
    },
    {
      era: "1943",
      sortYear: 1943,
      lissanoure: ["lucy"],
      family: [],
      parish: [],
    },
  ];
}

/* ------------------------------------------------------------ Henry roster */

/**
 * Every Henry Macartney / McCartney in Griffith's Valuation 1848–64, from the
 * complete index. Only these four exist in the whole survey. The "fit" column
 * is a reading of the setting and occupation, not a link: none is tied to
 * Richard Henry by any record.
 */
export function henryCandidates(): HenryCandidate[] {
  return [
    {
      key: "cromkill",
      name: "Henry Mc Cartney",
      record: "Griffith's Valuation, 1861",
      county: "Antrim",
      parish: "Connor",
      townland: "Cromkill",
      setting: "rural",
      fit: "best",
      note: "A rural townland holding, with five other McCartney occupiers around him. Fits 'farmer' exactly, sits in the surname's Antrim heartland, and is the only rural Antrim Henry in the survey. The 1901/1911 census shows a Macartney farm continuing in the same townland.",
      source: GV_HENRY_MC,
    },
    {
      key: "crappagh",
      name: "Henry Mc Cartney",
      record: "Griffith's Valuation; Tithe Applotment 1833",
      county: "Monaghan",
      parish: "Aghabog",
      townland: "Crappagh",
      setting: "rural",
      fit: "possible",
      note: "A rural holding, and the only Henry who also appears in the tithe books (1833) — so he was an adult landholder a generation earlier. Monaghan is Ulster, but far from the Antrim surname cluster; no record connects him to Dublin.",
      source: CRAPPAGH,
    },
    {
      key: "garvaghy",
      name: "Henry Mc Cartney",
      record: "Griffith's Valuation, 1861",
      county: "Antrim",
      parish: "Portglenone",
      townland: "Garvaghy Road",
      setting: "urban",
      fit: "weak",
      note: "A street address, not a farm. The 1901 census at Garvaghy shows two Henry McCartneys, both shoemakers — a different occupational family. Does not fit 'farmer'.",
      source: GV_HENRY_MC,
    },
    {
      key: "greencastle",
      name: "Henry Macartney",
      record: "Griffith's Valuation, 1861",
      county: "Antrim",
      parish: "Shankill",
      townland: "Green Castle, Belfast",
      setting: "urban",
      fit: "weak",
      note: "The only Henry under the Macartney spelling, but in a Belfast street, not a farm. The 1901 Henry MacArtney in Belfast is a soap-works labourer, born c.1847 — the next generation, not our Henry.",
      source: GV_HENRY_MAC,
    },
  ];
}

/* -------------------------------------------------------------- reasoning */

export const COMPARISON_VERDICT =
  "Same surname, a candidate in the same county — and no record joins the two lines.";

export function reasons(): Reason[] {
  return [
    {
      title: "The Earl died without issue, so there is no descent from him",
      detail:
        "George Macartney, 1st Earl Macartney, died in 1806 leaving no children. His titles became extinct and the Lissanoure estate passed through his sister Elizabeth's daughter to the Humes, who took the name. Any real connection would therefore have to be a cadet branch or a shared ancestor further back — never a descent from the Earl himself.",
    },
    {
      title: "The documented Lissanoure line is gentry, and no farmer cadet is recorded",
      detail:
        "From the 1626 Sheriff to the last of the name in 1943, every generation in the printed pedigrees is an officer, clergyman, magistrate, MP or landowner. The one cadet branch the sources name — Arthur, a younger son of the 1626 George, in Belfast — is recorded only into the 1720s. No published pedigree puts a Macartney farmer in Connor parish.",
    },
    {
      title: "Our earliest named ancestor has no birth, marriage, death or place",
      detail:
        "Henry Macartney is known only from the father column of his son's 1870 marriage register: 'Henry Macartney, farmer'. He married before civil registration began in 1845; no baptism of Richard Henry exists in the digitised church registers; and the will calendars contain no probate or administration for any Henry Macartney under any spelling. Every route from Henry upwards is closed by a missing record, not by a contradiction.",
    },
    {
      title: "The land records give four Henrys, and none is tied to Richard Henry",
      detail:
        "Griffith's Valuation 1848–64 contains exactly four Henry Macartney/McCartney entries in Ireland: Cromkill (Antrim), Crappagh (Monaghan), Garvaghy Road (Antrim) and Green Castle, Belfast. Cromkill is the best fit for a farmer and the surname's heartland, but no valuation, tithe, will or census record names both Henry and Richard together. Choosing between the four would be a guess dressed as a conclusion.",
    },
    {
      title: "The geography is close enough to be tempting, and that is the trap",
      detail:
        "Lissanoure is in Loughguile, north Co. Antrim; Cromkill is in Connor parish, mid-Antrim, some 30 miles away. Same county, same century, same surname — which is exactly why name-sharing proves nothing here. The 1901 census alone counts 188 Macartneys in Antrim.",
    },
    {
      title: "The records that would bridge the gap were destroyed or never kept",
      detail:
        "The Four Courts fire of 1922 destroyed the pre-1900 wills and probate records and many parish registers. Civil registration of births, marriages and deaths only begins in 1864. The 1821–51 censuses survive for only a few places and not for Connor. The missing generations — Henry's parents, c.1780–1810 — fall in the worst-documented window in Irish genealogy.",
    },
    {
      title: "One family, several spellings, hundreds of households",
      detail:
        "Macartney, McCartney, Mc Cartney and M'Cartney are the same name written by different clerks; the Dublin family itself drifts between Macartney and McCartney in the same sibling group. The Irish Roots index counts 855 Macartney records and over 300 McCartney records across 17 counties for 1823–1911. A surname search without a place is a haystack, not a lead.",
    },
  ];
}

export function nextRecords(): NextRecord[] {
  return [
    {
      record: "Richard Henry Macartney's baptism, c.1841, Connor parish",
      gives:
        "The single record that would name Henry, his wife and the townland together. Connor's Church of Ireland registers are at PRONI; the baptism is not in the free digitised set.",
      where: "PRONI, Belfast (parish register microfilms; MIC/1 series)",
      url: "https://www.nidirect.gov.uk/articles/church-records",
    },
    {
      record: "Henry Macartney's marriage, before 1845",
      gives:
        "Names Henry's wife and both families, and fixes the parish. A pre-1845 marriage is only in the church registers, which is why the civil index cannot see it.",
      where: "PRONI / the parish registers of Connor and neighbouring parishes",
      url: "https://www.nidirect.gov.uk/articles/church-records",
    },
    {
      record: "Dublin diocesan marriage-licence bond, 1870",
      gives:
        "The St Mark's marriage was by licence, so a bond survives. It names the groom's parish — the cleanest single key to our side's place.",
      where: "Representative Church Body Library, Dublin; National Archives of Ireland",
      url: "https://rcb.library.ie/",
    },
    {
      record: "Valuation Revision Books for Cromkill, 1861–1930",
      gives:
        "Shows whose holding passed to whom after Henry. If the Cromkill farm passed to Matthew (b. c.1846), it documents the family's continuity and Henry's death — not our Richard, but the strongest test of the candidate.",
      where: "PRONI (VAL/12/B series); Valuation Office, Dublin",
      url: "https://www.nidirect.gov.uk/articles/valuation-records",
    },
    {
      record: "The five Henry Macartney death registers, 1864–1901",
      gives:
        "The occupation and place-of-death columns separate farmer from labourer and give a townland. They are handwritten returns, so a human read is needed; the index links are in the research report.",
      where: "irishgenealogy.ie register images (free PDFs)",
      url: "https://www.irishgenealogy.ie/en/civil-records/help/what-civil-records-are-available",
    },
    {
      record: "Lissanoure estate papers, 1697–1802",
      gives:
        "Rentals and tenant lists for the Earl's estate. Only useful if a Macartney farmer appears on them — and a tenant on a Macartney estate would still prove tenancy, not kinship.",
      where: "PRONI D572, D1062/2, D2225, D2731; NLI MS 45,806",
      url: "https://sources.nli.ie/Record/MS_UR_045806/Details?lng=ga",
    },
  ];
}

/** Every distinct source behind either line, for the page's source panel. */
export function allSources(): LineSource[] {
  const seen = new Map<string, LineSource>();
  for (const entry of [...lissanoureLine(), ...familyLine(), ...parishLane()]) {
    for (const source of entry.sources) seen.set(source.url, source);
  }
  for (const candidate of henryCandidates()) seen.set(candidate.source.url, candidate.source);
  for (const record of nextRecords()) {
    if (record.url) seen.set(record.url, { label: record.where, url: record.url });
  }
  for (const source of [MUSTER_1630, FLAX_1796, PRONI_PAPERS, NLI_LISSANOURE]) {
    seen.set(source.url, source);
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Keys that must exist — used by the integrity test. */
export function entryIndex(): Map<string, LineEntry> {
  const index = new Map<string, LineEntry>();
  for (const entry of [...lissanoureLine(), ...familyLine(), ...parishLane()]) {
    if (index.has(entry.key)) throw new Error(`duplicate comparison key: ${entry.key}`);
    index.set(entry.key, entry);
  }
  return index;
}
