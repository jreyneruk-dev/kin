import { describe, expect, it } from "vitest";
import {
  familysearchUrl,
  findmypastUrl,
  freebmdUrl,
  nameVariants,
  researchPack,
  splitFullName,
  wikitreeUrl,
} from "../src/lib/research-links";

describe("nameVariants", () => {
  it("expands Macartney to McCartney", () => {
    expect(nameVariants("Macartney")).toContain("McCartney");
  });

  it("expands McCartney to Macartney", () => {
    expect(nameVariants("McCartney")).toContain("Macartney");
  });

  it("keeps the original token among the variants", () => {
    expect(nameVariants("Macartney")).toContain("Macartney");
  });

  it("does not mangle given names that merely contain 'mac'", () => {
    // minLength guards: 'Mac' alone is not a surname prefix we can safely expand.
    expect(nameVariants("Mac")).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(nameVariants("")).toEqual([]);
    expect(nameVariants("   ")).toEqual([]);
  });
});

describe("splitFullName", () => {
  it("splits on the first space", () => {
    expect(splitFullName("William H Macartney")).toEqual({ first: "William", last: "H Macartney" });
  });

  it("treats a single word as a surname", () => {
    expect(splitFullName("Eileen")).toEqual({ first: "", last: "Eileen" });
  });
});

describe("findmypastUrl", () => {
  it("encodes name params on the verified canonical path", () => {
    expect(findmypastUrl("William", "Macartney")).toBe(
      "https://www.findmypast.co.uk/search/results?firstname=William&lastname=Macartney",
    );
  });

  it("carries the birth-year window (verified working filter params)", () => {
    expect(findmypastUrl("William", "Macartney", { year: 1871, range: 5 })).toBe(
      "https://www.findmypast.co.uk/search/results?firstname=William&lastname=Macartney&yearofbirth=1871&yearofbirth_offset=5",
    );
  });

  it("handles names with spaces (URLSearchParams uses + for spaces)", () => {
    expect(findmypastUrl("Edith Maude", "Grainger")).toBe(
      "https://www.findmypast.co.uk/search/results?firstname=Edith+Maude&lastname=Grainger",
    );
  });
});

describe("freebmdUrl", () => {
  it("produces the verified cgi search with a year window", () => {
    expect(freebmdUrl("William", "Macartney", { year: 1871 })).toBe(
      "https://www.freebmd.org.uk/cgi/search.pl?given=William&surname=Macartney&start=1866&end=1876&type=Births",
    );
  });
});

describe("familysearchUrl", () => {
  it("builds the record-results URL with a date", () => {
    expect(familysearchUrl("William", "Macartney", { year: 1871 })).toBe(
      "https://www.familysearch.org/en/search/record/results?givenName=William&surname=Macartney&q.recordDate=1871&q.recordDate.context=power",
    );
  });
});

describe("wikitreeUrl", () => {
  it("targets the index search", () => {
    expect(wikitreeUrl("William", "Macartney")).toBe(
      "https://www.wikitree.com/find/index.html?given=William&surname=Macartney",
    );
  });
});

describe("researchPack", () => {
  it("covers all alias surnames for the McCartney/Macartney problem", () => {
    const pack = researchPack("Eileen McCartney", ["Eileen Macartney"], 1898);
    const labels = pack.map((t) => t.label);
    expect(labels.some((l) => l.includes("McCartney"))).toBe(true);
    expect(labels.some((l) => l.includes("Macartney"))).toBe(true);
  });

  it("takes the surname from the last token, initials are not surnames", () => {
    const pack = researchPack("Kathleen S Macartney", [], 1902);
    expect(pack.some((t) => t.label.includes("FindMyPast — Kathleen Macartney"))).toBe(true);
  });

  it("always includes the landing links for param-refusing sites", () => {
    const pack = researchPack("William Macartney", []);
    expect(pack.some((t) => t.url.startsWith("https://geni.nidirect.gov.uk"))).toBe(true);
    expect(pack.some((t) => t.url === "https://irishgenealogy.ie/")).toBe(true);
    expect(pack.some((t) => t.url === "https://www.freereg.org.uk/search")).toBe(true);
  });

  it("stays under the sprawl cap", () => {
    const pack = researchPack("William Macartney", ["A", "B", "C", "D", "E", "F", "G"]);
    expect(pack.length).toBeLessThanOrEqual(25);
  });
});
