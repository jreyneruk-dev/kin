/**
 * Deep-link builders for the family's research sites (Build 1).
 * Pure functions — unit-tested, no DB, no DOM.
 *
 * Every URL was verified against the live sites (2026-10):
 *  - findmypast: canonical modern path is /search/results?<params>; the old
 *    search.<tld> paths 301 into it and keep the query string. The .ie host
 *    hard-403s unlogged-in requests, so links go to the co.uk/.com hosts.
 *  - FreeBMD cgi/search.pl confirmed (200, params live).
 *  - FamilySearch record/results works in browsers (curl UA gets bot-blocked).
 *  - irishgenealogy / FreeREG / GRONI drop query params on redirect, so those
 *    get clean landing-page links — one manual form-fill is enough there.
 *
 * ToS note (fixes the automation boundary): FindMyPast terms prohibit
 * automated access tools, so kin never fetches these pages — it only *links*
 * to them. Humans search, humans report back via the findings form.
 */

export interface ResearchTarget {
  /** Label rendered in the search pack. */
  label: string;
  url: string;
  /** Short hint shown as the row's title attribute. */
  note: string;
}

const NAME_SPLIT = /(\s+)/;

/**
 * Search variants for the family's known name problem (Macartney ↔
 * McCartney ↔ "Mac Cartney"). The Irish clan marker is the two letters
 * "Ma" — everything after it is the stem, so Macartney and McCartney share
 * the stem chartney/cartney and differ only in the marker's second letter.
 * Output is the surname set: identity, the flipped marker both ways (with the
 * conventional Mc + Capital-stem form), and the spaced record form.
 */
export function nameVariants(name: string): string[] {
  const out = new Set<string>();
  const clean = name.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  for (const part of clean.split(NAME_SPLIT)) {
    const token = part.trim();
    if (token.length < 4) continue;
    const lower = token.toLowerCase();
    if (!lower.startsWith("mac") && !lower.startsWith("mc")) continue;
    const stem = token.slice(2); // "cartney" / "Cartney" — original case kept
    const up = stem.charAt(0).toUpperCase() + stem.slice(1);
    const lo = stem.charAt(0).toLowerCase() + stem.slice(1);
    out.add(token);       // as recorded
    out.add(`Mc${up}`);   // McCartney-style
    out.add(`Mac${lo}`);  // Macartney-style
    out.add(`Mac ${lo}`); // "Mac cartney" — the spaced register form
    if (lower.startsWith("mc")) out.add(`Ma${lo}`); // McCartney → Macartney: the c is part of the marker, not the stem
  }
  return [...out];
}

/** FamilySearch relies on recorded name fields; surnames go through as typed. */
function encodeParam(value: string): string {
  return encodeURIComponent(value);
}

/**
 * FindMyPast results URL. Verified live in the logged-in UI session:
 * lastname, firstname, yearofbirth + yearofbirth_offset (they DO restrict the
 * results — the older yob/yorange params survive redirects but do not filter).
 * Add sourcecategory=life%20events%20(bmds) for the free civil BMD index slice.
 */
export function findmypastUrl(first: string, last: string, opts: { year?: number | null; range?: number } = {}): string {
  const params = new URLSearchParams();
  if (first) params.set("firstname", first);
  if (last) params.set("lastname", last);
  if (opts.year != null && Number.isFinite(opts.year)) {
    params.set("yearofbirth", String(opts.year));
    params.set("yearofbirth_offset", String(opts.range ?? 5));
  }
  return `https://www.findmypast.co.uk/search/results?${params}`;
}

/** FreeBMD — the genuinely free England/Wales BMD index (verified 200). */
export function freebmdUrl(first: string, last: string, opts: { year?: number | null; range?: number; kind?: "births" } = {}): string {
  const params = new URLSearchParams();
  if (first) params.set("given", first);
  if (last) params.set("surname", last);
  if (opts.year != null) {
    params.set("start", String(opts.year - (opts.range ?? 5)));
    params.set("end", String(opts.year + (opts.range ?? 5)));
  }
  params.set("type", opts.kind ?? "Births");
  return `https://www.freebmd.org.uk/cgi/search.pl?${params}`;
}

export function familysearchUrl(first: string, last: string, opts: { year?: number | null } = {}): string {
  const params = new URLSearchParams();
  if (first) params.set("givenName", first);
  if (last) params.set("surname", last);
  if (opts.year != null) {
    params.set("q.recordDate", String(opts.year));
    params.set("q.recordDate.context", "power");
  }
  return `https://www.familysearch.org/en/search/record/results?${params}`;
}

export function wikitreeUrl(first: string, last: string): string {
  const params = new URLSearchParams();
  if (first) params.set("given", first);
  if (last) params.set("surname", last);
  return `https://www.wikitree.com/find/index.html?${params}`;
}

/** Landing pages for sites whose search forms can't be pre-filled by URL. */
export const LANDING_LINKS: ResearchTarget[] = [
  { label: "GRONI (NI civil records)", url: "https://geni.nidirect.gov.uk/", note: "Northern Ireland births >100 yrs free to view — search the surname alone" },
  { label: "irishgenealogy.ie", url: "https://irishgenealogy.ie/", note: "Free Irish civil records — the Ireland/Britain-islands side of the family" },
  { label: "FreeREG (parish registers)", url: "https://www.freereg.org.uk/search", note: "Pre-1837 parish baptisms, marriages, burials — free transcripts" },
];

/** First/given name: everything before the first space. */
export function splitFullName(fullName: string): { first: string; last: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.indexOf(" ");
  return idx === -1
    ? { first: "", last: trimmed }
    : { first: trimmed.slice(0, idx), last: trimmed.slice(idx + 1) };
}

/**
 * The search pack for one person. Surname candidates come from the last token
 * of the recorded name and of every alias (kin records "Kathleen S
 * Macartney" — initials are not surnames), each expanded through
 * nameVariants. Capped so the panel never sprawls.
 */
export function surnameCandidates(fullName: string, aliases: string[]): string[] {
  const raw = [fullName, ...aliases].map(
    (n) => n.trim().split(/\s+/).pop() ?? "",
  );
  const uniq = new Set<string>();
  for (const surname of raw) {
    if (surname.length < 2) continue;
    uniq.add(surname);
    for (const variant of nameVariants(surname)) uniq.add(variant);
  }
  return [...uniq].slice(0, 6);
}

export function researchPack(fullName: string, aliases: string[], year?: number | null): ResearchTarget[] {
  const given = splitFullName(fullName).first;
  const targets: ResearchTarget[] = [];

  for (const surname of surnameCandidates(fullName, aliases)) {
    targets.push({
      label: `FindMyPast — ${given || "any"} ${surname}`,
      url: findmypastUrl(given, surname, { year: year ?? null }),
      note: "free index search (log in for the free results view)",
    });
    targets.push({
      label: `FreeBMD — ${given || "any"} ${surname}`,
      url: freebmdUrl(given, surname, { year: year ?? null }),
      note: "free England/Wales birth index",
    });
    targets.push({
      label: `FamilySearch — ${given || "any"} ${surname}`,
      url: familysearchUrl(given, surname, { year: year ?? null }),
      note: "free shared tree + index (own free account)",
    });
  }
  targets.push({
    label: "WikiTree — all variants",
    url: wikitreeUrl(given, splitFullName(fullName).last),
    note: "free collaborative tree — check what other researchers concluded",
  });
  targets.push(...LANDING_LINKS);
  return targets;
}

/** Guard against encoding accidents in the family's names. */
export { encodeParam };
