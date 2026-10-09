/**
 * Pure Phase 1 helpers: fact grouping with conflict detection, per-person
 * completeness, alias-aware search, and source-kind inference. No DB, no
 * React — everything here is unit-tested.
 */

import type { Fact, Person, SourceKind } from "./types";

/** All fact kinds, in display order (life events first). */
export const FACT_KIND_ORDER = [
  "birth", "baptism", "marriage", "death", "burial",
  "residence", "emigration", "occupation", "census", "military", "note",
] as const;

export type FactGroup = {
  kind: string;
  facts: Fact[];
  /** True when the kind holds 2+ entries — competing evidence worth a look. */
  conflict: boolean;
};

/**
 * Group facts by kind in display order; drop empty groups. A group with 2+
 * entries is flagged as a potential conflict so the family notices and
 * discusses it (FamilySearch etiquette: explain, don't overwrite).
 */
export function groupFacts(facts: Fact[]): FactGroup[] {
  const byKind = new Map<string, Fact[]>();
  for (const f of facts) {
    const arr = byKind.get(f.kind) ?? [];
    arr.push(f);
    byKind.set(f.kind, arr);
  }
  const groups: FactGroup[] = [];
  for (const kind of FACT_KIND_ORDER) {
    const list = byKind.get(kind);
    if (!list || list.length === 0) continue;
    groups.push({ kind, facts: list, conflict: list.length > 1 });
  }
  // Kinds not in the display order (future-proofing) keep insertion order at the end.
  for (const [kind, list] of byKind) {
    if ((FACT_KIND_ORDER as readonly string[]).includes(kind)) continue;
    groups.push({ kind, facts: list, conflict: list.length > 1 });
  }
  return groups;
}

export type Completeness = {
  /** Facts on this person that carry any source. */
  sourcedFacts: number;
  totalFacts: number;
  missing: { birth: boolean; death: boolean; place: boolean };
};

/**
 * The rendering rule behind the "Alive" tick box: a person is alive unless a
 * death is recorded. Death date OR place counts (some sources give a place
 * without a date). Deriving instead of storing both keeps them from ever
 * disagreeing; the stored boolean only covers the "user unticked by hand, no
 * death recorded" case.
 */
export function deriveLiving(person: { deathDate: string | null; deathPlace: string | null; living: boolean }): boolean {
  if (person.deathDate || person.deathPlace) return false;
  return person.living;
}

/** Completeness summary for the people index. */
export function completenessOf(person: Person, facts: Fact[]): Completeness {
  return {
    sourcedFacts: facts.filter((f) => f.source || f.sourceUrl).length,
    totalFacts: facts.length,
    missing: {
      birth: !person.birthDate,
      death: !person.living && !person.deathDate,
      place: !person.birthPlace,
    },
  };
}

/**
 * Alias-aware search: a row matches when the query appears in the full name
 * or any alias (case-insensitive substring). Empty query matches nothing here
 * (callers decide what empty means).
 */
export function nameMatches(person: Pick<Person, "fullName" | "aliases">, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (person.fullName.toLowerCase().includes(q)) return true;
  return person.aliases.some((a) => a.toLowerCase().includes(q));
}

const SOURCE_KINDS: SourceKind[] = ["primary", "secondary", "family-lore", "negative", "unspecified"];

/** Accept a source kind from an API payload, defaulting safely. */
export function parseSourceKind(v: unknown): SourceKind {
  return SOURCE_KINDS.includes(v as SourceKind) ? (v as SourceKind) : "unspecified";
}

/**
 * Best-effort link detection for a pasted source: if the free-text source or
 * the dedicated URL field looks like an http(s) URL, it can render as a link.
 */
export function extractUrl(sourceText: string | null, sourceUrl: string | null): string | null {
  for (const candidate of [sourceUrl, sourceText]) {
    if (!candidate) continue;
    const m = candidate.match(/https?:\/\/[^\s,;)]+/i);
    if (m) return m[0];
  }
  return null;
}

