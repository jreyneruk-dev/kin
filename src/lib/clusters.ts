/**
 * Clusters — one database, several independent research lines.
 *
 * Every person and union belongs to exactly one cluster. `family` is the real
 * Macartney / Davies / Fahey tree: it is what the tree page, the people list,
 * the search and the GEDCOM export read, and what they must keep reading.
 *
 * A speculative line lives in the SAME tables under its own key, so it can be
 * researched with the app's full toolset — facts, sources, images, comments —
 * without one row of it touching the family tree. The first such line is the
 * documented Macartneys of Lissanoure, Co. Antrim (see
 * src/lib/seed-lissanoure-data.ts): a suspected but unproven connection to
 * George Macartney, 1st Earl Macartney.
 *
 * Reads take the cluster explicitly — `allPeople(cluster)` — and default to
 * `family`, so a read that forgets the argument can only ever be too narrow,
 * never leak. Writes derive it from the person they hang off
 * (see createPersonWithLink), so a relative added from a speculative profile
 * lands in that same speculative cluster instead of dropping into the tree.
 *
 * Combining two clusters later is then one deliberate step — move the
 * connected person, or add the linking union — and never a merge of two
 * half-populated trees.
 */

export const FAMILY_CLUSTER = "family";

/** The documented Macartneys of Lissanoure (Co. Antrim) — unproven relation. */
export const LISSANOURE_CLUSTER = "lissanoure";

/**
 * The clusters this build knows about, in selector order. Adding a research
 * line means adding its key here: an unknown key must never be accepted from a
 * query string, or a typo would silently widen (or empty) a read.
 */
export const CLUSTERS: readonly string[] = [FAMILY_CLUSTER, LISSANOURE_CLUSTER];

export function isKnownCluster(cluster: string): boolean {
  return CLUSTERS.includes(cluster);
}

/**
 * Cluster key from an untrusted source (a query string, a form field).
 * Anything absent, unknown or unusable falls back to the family tree.
 */
export function parseCluster(raw: string | null | undefined): string {
  if (typeof raw !== "string") return FAMILY_CLUSTER;
  const key = raw.trim().toLowerCase();
  return isKnownCluster(key) ? key : FAMILY_CLUSTER;
}

export function isFamilyCluster(cluster: string): boolean {
  return cluster === FAMILY_CLUSTER;
}
