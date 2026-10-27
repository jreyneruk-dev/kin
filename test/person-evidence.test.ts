import { describe, expect, it } from "vitest";
import type { Person } from "../src/lib/types";
import {
  COMPARE_HENRY_HREF,
  evidenceForPerson,
  findHenryInTree,
  henryEvidence,
  isHenryMacartney,
  nameKey,
} from "../src/lib/person-evidence";
import { familyLine, henryCandidates, nextRecords, parishLane } from "../src/lib/macartney-lines";
import { seedPeople, seedUnions, SEED_INDEX } from "../src/lib/seed-data";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 28,
    fullName: "Henry Macartney",
    cluster: "family",
    nameNote: null,
    aliases: [],
    sex: "m",
    birthDate: null,
    birthPlace: null,
    deathDate: null,
    deathPlace: null,
    notes: null,
    living: false,
    createdBy: "e2e",
    createdAt: 0,
    ...overrides,
  };
}

const isHttp = (url: string) => url.startsWith("https://") || url.startsWith("http://");

describe("matching the tree person", () => {
  it("recognises Henry and his spelling variants, and nobody else", () => {
    expect(isHenryMacartney(person())).toBe(true);
    expect(isHenryMacartney(person({ fullName: "Henry McCartney" }))).toBe(true);
    expect(isHenryMacartney(person({ fullName: "Henry Mc Cartney" }))).toBe(true);
    expect(isHenryMacartney(person({ fullName: "H. Macartney", aliases: ["Henry Macartney"] }))).toBe(true);

    expect(isHenryMacartney(person({ fullName: "Richard Henry Macartney" }))).toBe(false);
    expect(isHenryMacartney(person({ fullName: "William Henry Macartney" }))).toBe(false);
    expect(isHenryMacartney(person({ fullName: "Henry Macartney", cluster: "lissanoure" }))).toBe(false);
    expect(nameKey("Henry  MacArtney")).toBe("henrymacartney");
  });

  it("resolves only a person carrying the evidence key and withholds ambiguous links", () => {
    const henry = person({ researchEvidence: henryEvidence() });
    expect(findHenryInTree([person({ fullName: "Kathleen S Macartney" }), henry])).toBe(henry);
    const legacyHenry = person({ id: 13 });
    expect(findHenryInTree([legacyHenry])).toBe(legacyHenry);

    const otherHenry = person({ id: 99, researchEvidence: henryEvidence() });
    expect(findHenryInTree([henry, otherHenry])).toBeNull();
  });

  it("reads attached evidence without inferring it from a name", () => {
    const evidence = henryEvidence();
    expect(evidenceForPerson(person({ fullName: "Henry Macartney" }))).toBeNull();
    expect(
      evidenceForPerson(person({ fullName: "Kathleen S Macartney", researchEvidence: evidence })),
    ).toBe(evidence);
    expect(
      evidenceForPerson(
        person({ fullName: "Henry Macartney", cluster: "lissanoure", researchEvidence: evidence }),
      ),
    ).toBe(evidence);
  });

  it("attaches the canonical evidence directly to Henry's stable seed person record", () => {
    const people = seedPeople();
    const henry = people[SEED_INDEX.henry];
    expect(henry.fullName).toBe("Henry Macartney");
    expect(henry.researchEvidence).toEqual(henryEvidence());
    expect(henry.birthDate).toBeNull();
    expect(henry.deathDate).toBeNull();
    expect(people.slice(0, SEED_INDEX.henry).every((person) => !person.researchEvidence)).toBe(true);
  });

  it("does not fabricate parents or a family link for seeded Henry", () => {
    expect(SEED_INDEX.henry).toBe(12);
    const henry = seedPeople()[SEED_INDEX.henry];
    expect(henry.researchEvidence?.status).toBe("candidate");
    expect(henry.researchEvidence?.nextRecord.record).toBe("Richard Henry Macartney's baptism, c.1841, Connor parish");
    expect(Object.keys(henry.researchEvidence ?? {})).not.toContain("parent");
    expect(seedUnions().every(({ a, b }) => a !== SEED_INDEX.henry && b !== SEED_INDEX.henry)).toBe(true);
  });
});

describe("the evidence attached to Henry", () => {
  it("keeps the ledger's candidate status, dates and wording", () => {
    const evidence = henryEvidence();
    const ledger = familyLine().find((entry) => entry.key === "henry");
    expect(evidence.status).toBe("candidate");
    expect(evidence.name).toBe("Henry Macartney");
    expect(evidence.dates).toBe(ledger?.dates);
    expect(evidence.place).toBe(ledger?.place);
    expect(evidence.place).toContain("Cromkill");
    expect(evidence.place).toContain("candidate only");
    expect(evidence.dates).toContain("?");
    expect(evidence.role).toBe("Farmer");
  });

  it("carries the Griffith's entry, all four Henrys and the 1861 Cromkill cluster", () => {
    const evidence = henryEvidence();
    expect(evidence.candidate.townland).toBe("Cromkill");
    expect(evidence.candidate.fit).toBe("best");
    expect(evidence.candidates).toHaveLength(4);
    expect(evidence.candidates.map((candidate) => candidate.townland).sort()).toEqual([
      "Crappagh",
      "Cromkill",
      "Garvaghy Road",
      "Green Castle, Belfast",
    ]);
    expect(evidence.cromkillHouseholds.evidence).toBe("candidate");
    expect(evidence.cromkillHouseholds.place).toContain("Cromkill");
  });

  it("carries the 1835 tithe gap and the 1669 hearth-roll context", () => {
    const evidence = henryEvidence();
    expect(evidence.titheGap.evidence).toBe("context");
    expect(evidence.titheGap.dates).toBe("1835");
    expect(evidence.titheGap.note).toContain("no Henry");
    expect(evidence.hearthContext.evidence).toBe("context");
    expect(evidence.hearthContext.dates).toBe("1669");
    expect(evidence.hearthContext.place).toContain("Connor");
  });

  it("names the record that would break the wall, not a guessed parent", () => {
    const evidence = henryEvidence();
    expect(evidence.nextRecord.record).toContain("baptism");
    expect(evidence.nextRecord.record).toContain("Richard Henry Macartney");
    expect(evidence.nextRecord.where).toContain("PRONI");
    expect(Object.keys(evidence)).not.toContain("parent");
    expect(evidence.summary).toContain("No birth, marriage, death or place record survives");
    expect(evidence.summary).not.toContain("descended from the Earl");
  });

  it("links to the side-by-side comparison and sources every claim", () => {
    const evidence = henryEvidence();
    expect(evidence.compareHref).toBe(COMPARE_HENRY_HREF);
    expect(evidence.sources.length).toBeGreaterThanOrEqual(6);
    expect(new Set(evidence.sources.map((source) => source.url)).size).toBe(evidence.sources.length);
    expect(evidence.sources.every((source) => isHttp(source.url))).toBe(true);
    expect(evidence.sources.some((source) => source.label.includes("1870"))).toBe(true);
    expect(evidence.sources.some((source) => source.label.includes("Tithe"))).toBe(true);
    expect(evidence.sources.some((source) => source.label.includes("Hearth"))).toBe(true);
  });
});

describe("the profile and /compare read the same source", () => {
  it("returns the identical underlying records from the comparison module", () => {
    const evidence = henryEvidence();
    expect(evidence.summary).toBe(familyLine().find((entry) => entry.key === "henry")?.note);
    expect(evidence.candidate).toEqual(henryCandidates().find((entry) => entry.fit === "best"));
    expect(evidence.candidates).toEqual(henryCandidates());
    expect(evidence.titheGap).toEqual(parishLane().find((entry) => entry.key === "connor-tithe-1835"));
    expect(evidence.hearthContext).toEqual(parishLane().find((entry) => entry.key === "walter-1669"));
    expect(evidence.cromkillHouseholds).toEqual(
      parishLane().find((entry) => entry.key === "cromkill-gv-1861"),
    );
    expect(evidence.nextRecord).toEqual(nextRecords()[0]);
  });

  it("never claims the lines are joined", () => {
    const evidence = henryEvidence();
    expect(evidence.verdict).toContain("no record joins");
    expect(evidence.summary.toLowerCase()).not.toContain("proven link");
  });
});
