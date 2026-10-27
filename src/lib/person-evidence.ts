/**
 * Research evidence attached to a family-tree person.
 *
 * `macartney-lines.ts` is the canonical source for the sourced comparison.
 * This module assembles that data into one typed `PersonResearchEvidence`
 * payload stored on Henry's person record. The profile and `/compare` both
 * render the attached payload; neither infers evidence from a display name.
 *
 * It is deliberately an overlay, not a parent row. Henry has one documentary
 * appearance — the father column of the 1870 St Mark's register — and no record
 * names his parents. Writing a parent into the database would invent the very
 * generation the research says is missing. The profile therefore reads this
 * evidence, labels it CANDIDATE, and says plainly that the tree adds no parent
 * and no date. The seeded family person itself carries this typed evidence; a
 * legacy DB seed may still hydrate it until the owner runs the seed migration.
 */

import type {
  HenryResearchCandidate,
  HenryResearchLineEntry,
  HenryResearchNextRecord,
  Person,
  PersonResearchEvidence,
  ResearchEvidenceSource,
  ResearchEvidenceStatus,
} from "./types";
import { isFamilyCluster } from "./clusters";
import {
  COMPARISON_VERDICT,
  familyLine,
  type LineSource,
  henryCandidates,
  nextRecords,
  parishLane,
} from "./macartney-lines";

/** Stable database person id for the additional Henry seed row (serial id 13). */
export const HENRY_TREE_PERSON_ID = 13;

/** `/compare` anchors its date-by-date table here. */
export const COMPARE_HENRY_HREF = "/compare#comparison-heading";

/** `/compare` puts the link back to Henry's profile here. */
export const COMPARE_PROFILE_ANCHOR = "henry-in-the-tree";

/**
 * Spelling variants of the one forename + surname pair. Deliberately exact:
 * "Richard Henry" and "William Henry" must never pick up Henry's evidence.
 */
const HENRY_NAME_KEYS = new Set(["henrymacartney", "henrymccartney", "henrymcartney"]);

export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function isHenryMacartney(
  person: Pick<Person, "fullName" | "aliases" | "cluster">,
): boolean {
  if (!isFamilyCluster(person.cluster)) return false;
  return [person.fullName, ...person.aliases].some((name) => HENRY_NAME_KEYS.has(nameKey(name)));
}

/**
 * The family-tree row this comparison is about. Exactly one exact-name match is
 * required; if two Henrys exist the link is withheld rather than guessed at.
 * Alias-only matches are accepted only when there is a single candidate.
 */
export function findHenryInTree(people: Person[]): Person | null {
  const matches = people.filter(
    (person) => person.researchEvidence?.key === "henry" || evidenceForLegacyHenryRow(person),
  );
  return matches.length === 1 ? matches[0] : null;
}

export interface HenryEvidence extends PersonResearchEvidence {
  key: "henry";
  status: ResearchEvidenceStatus;
  name: string;
  dates: string;
  place: string;
  role: string;
  /** The full sourced note from the comparison data. */
  summary: string;
  verdict: string;
  /** Griffith's 1861 entry at Cromkill — the best fit, never a proof. */
  candidate: HenryResearchCandidate;
  /** All four Henry entries in Griffith's Valuation. */
  candidates: HenryResearchCandidate[];
  /** The 1835 Connor tithe book, which contains no Henry. */
  titheGap: HenryResearchLineEntry;
  /** The 1669 Kells/Connor hearth-roll household. */
  hearthContext: HenryResearchLineEntry;
  /** The six McCartney occupiers in Cromkill in 1861. */
  cromkillHouseholds: HenryResearchLineEntry;
  /** The record that would name Henry and Richard together. */
  nextRecord: HenryResearchNextRecord;
  sources: ResearchEvidenceSource[];
  compareHref: string;
}

/**
 * Build Henry's typed record value from the canonical comparison records.
 * The seed stores this once; profile and /compare read the stored field.
 */
export function henryEvidence(): HenryEvidence {
  const henry = familyLine().find((entry) => entry.key === "henry");
  const candidates = henryCandidates();
  const candidate = candidates.find((entry) => entry.fit === "best");
  const titheGap = parishLane().find((entry) => entry.key === "connor-tithe-1835");
  const hearthContext = parishLane().find((entry) => entry.key === "walter-1669");
  const cromkillHouseholds = parishLane().find((entry) => entry.key === "cromkill-gv-1861");
  const nextRecord = nextRecords().find((record) => /baptism/i.test(record.record));

  if (!henry || !candidate || !titheGap || !hearthContext || !cromkillHouseholds || !nextRecord) {
    throw new Error("the Macartney comparison data is missing a record Henry's evidence needs");
  }

  const sources = new Map<string, LineSource>();
  for (const source of [
    ...henry.sources,
    candidate.source,
    ...titheGap.sources,
    ...hearthContext.sources,
    ...cromkillHouseholds.sources,
  ]) {
    sources.set(source.url, source);
  }
  if (nextRecord.url) sources.set(nextRecord.url, { label: nextRecord.where, url: nextRecord.url });

  return {
    key: "henry",
    status: henry.evidence,
    name: henry.name,
    dates: henry.dates,
    place: henry.place,
    role: henry.role,
    summary: henry.note,
    verdict: COMPARISON_VERDICT,
    candidate,
    candidates,
    titheGap,
    hearthContext,
    cromkillHouseholds,
    nextRecord,
    sources: [...sources.values()],
    compareHref: COMPARE_HENRY_HREF,
  };
}

/** Read evidence already attached to a person record; never infer by name here. */
export function evidenceForPerson(
  person: Pick<Person, "researchEvidence">,
): HenryEvidence | null {
  return person.researchEvidence?.key === "henry" ? person.researchEvidence : null;
}

/** Read the original twelve-person DB seed without mutating it or guessing a relation. */
export function evidenceForLegacyHenryRow(
  person: Pick<Person, "id" | "fullName" | "aliases" | "cluster">,
): HenryEvidence | undefined {
  return person.id === HENRY_TREE_PERSON_ID && isHenryMacartney(person) ? henryEvidence() : undefined;
}
