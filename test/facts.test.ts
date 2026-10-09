import { describe, expect, it } from "vitest";
import {
  completenessOf,
  extractUrl,
  groupFacts,
  nameMatches,
  parseSourceKind,
} from "../src/lib/facts";
import type { Fact, Person } from "../src/lib/types";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 1,
    fullName: "Eileen McCartney",
    cluster: "family",
    nameNote: null,
    aliases: ["Eileen Macartney"],
    sex: "f",
    birthDate: null,
    birthPlace: null,
    deathDate: null,
    deathPlace: null,
    notes: null,
    living: false,
    createdBy: "seed",
    createdAt: 0,
    ...overrides,
  };
}

function fact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: 1,
    personId: 1,
    kind: "birth",
    detail: "Q1 1897",
    source: null,
    sourceUrl: null,
    sourceKind: "unspecified",
    confidence: "likely",
    createdBy: "seed",
    createdAt: 0,
    ...overrides,
  };
}

describe("groupFacts", () => {
  it("groups by kind in life-event order and drops empty kinds", () => {
    const groups = groupFacts([
      fact({ id: 2, kind: "death", detail: "1970" }),
      fact({ id: 1, kind: "birth", detail: "Q1 1897" }),
      fact({ id: 3, kind: "census", detail: "1901" }),
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["birth", "death", "census"]);
    expect(groups.every((g) => !g.conflict)).toBe(true);
  });

  it("flags a conflict when one kind holds 2+ entries", () => {
    const groups = groupFacts([
      fact({ id: 1, detail: "Q1 1897" }),
      fact({ id: 2, detail: "Jun 1897" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].conflict).toBe(true);
    expect(groups[0].facts).toHaveLength(2);
  });
});

describe("completenessOf", () => {
  it("counts sourced facts and missing fields", () => {
    const p = person({ birthDate: "1897", deathDate: null });
    const c = completenessOf(p, [
      fact({ id: 1, source: "GRO index" }),
      fact({ id: 2, sourceUrl: "https://example.com/record" }),
      fact({ id: 3, sourceKind: "negative", source: "searched GRO" }),
    ]);
    // A negative search *is* a source: it records where you looked.
    expect(c.sourcedFacts).toBe(3);
    expect(c.totalFacts).toBe(3);
    expect(c.missing).toEqual({ birth: false, death: true, place: true });
  });

  it("treats a living person's missing death as not-missing", () => {
    const c = completenessOf(person({ living: true }), []);
    expect(c.missing.death).toBe(false);
  });
});

describe("nameMatches", () => {
  it("matches the full name case-insensitively", () => {
    expect(nameMatches(person(), "eileen")).toBe(true);
  });

  it("matches an alias — the McCartney/Macartney case", () => {
    expect(nameMatches(person(), "macartney")).toBe(true);
  });

  it("does not match unrelated queries", () => {
    expect(nameMatches(person(), "fahey")).toBe(false);
  });

  it("never matches the empty query", () => {
    expect(nameMatches(person(), "")).toBe(false);
    expect(nameMatches(person(), "   ")).toBe(false);
  });
});

describe("parseSourceKind", () => {
  it("accepts valid kinds", () => {
    expect(parseSourceKind("primary")).toBe("primary");
    expect(parseSourceKind("negative")).toBe("negative");
  });

  it("defaults unknown values to unspecified", () => {
    expect(parseSourceKind("wiki")).toBe("unspecified");
    expect(parseSourceKind(undefined)).toBe("unspecified");
  });
});

describe("extractUrl", () => {
  it("prefers the dedicated URL field", () => {
    expect(
      extractUrl("GRO index", "https://www.gro.gov.uk/record/123"),
    ).toBe("https://www.gro.gov.uk/record/123");
  });

  it("finds a URL pasted into the free-text source", () => {
    expect(extractUrl("see https://example.com/x, checked today", null)).toBe(
      "https://example.com/x",
    );
  });

  it("returns null when there is no link", () => {
    expect(extractUrl("GRO birth index", null)).toBeNull();
  });
});
