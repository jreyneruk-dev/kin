import { describe, expect, it } from "vitest";
import {
  defaultAction,
  displayName,
  foldContinuations,
  matchAll,
  normaliseName,
  parseGedcom,
  parseLine,
  scoreMatch,
  splitName,
  yearOf,
} from "../src/lib/gedcom";
import { exportGedcom, splitKinName } from "../src/lib/gedcom-export";
import type { Fact, Person, Union } from "../src/lib/types";

const SAMPLE = `0 HEAD
1 SOUR Ancestry Family Trees
1 CHAR UTF-8
0 @I1@ INDI
1 NAME William H /Macartney/
1 SEX M
1 BIRT
2 DATE 1871
1 DEAT
2 DATE AFT 1924
2 PLAC Plymouth, Devon
1 FAMS @F1@
1 OCCU Railway porter
0 @I2@ INDI
1 NAME Edith Maude /Grainger/
1 SEX F
1 BIRT
2 DATE 1874
1 FAMS @F1@
0 @I3@ INDI
1 NAME Eileen /McCartney/
2 NAME Eileen /Macartney/
1 SEX F
1 BIRT
2 DATE JUN 1897
1 FAMC @F1@
0 @I4@ INDI
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 25 DEC 1896
2 PLAC Plymouth Registry
0 TRLR
`;

describe("parseLine / foldContinuations", () => {
  it("parses LEVEL XREF TAG VALUE", () => {
    expect(parseLine("0 @I1@ INDI")).toEqual({ level: 0, xref: "@I1@", tag: "INDI", value: "" });
    expect(parseLine("2 DATE 25 DEC 1896")).toEqual({ level: 2, xref: null, tag: "DATE", value: "25 DEC 1896" });
    expect(parseLine("")).toBeNull();
  });

  it("folds CONC/CONT into the previous value", () => {
    const folded = foldContinuations(
      [
        "1 NOTE line one",
        "2 CONT line two",
        "2 CONC appended",
      ].map((l) => parseLine(l as never) as never),
    );
    expect(folded).toHaveLength(1);
    expect(folded[0].value).toBe("line one\nline twoappended");
  });
});

describe("name helpers", () => {
  it("splits GEDCOM slash names", () => {
    expect(splitName("William H /Macartney/")).toEqual({ given: "William H", surname: "Macartney" });
    expect(splitName("NoSurname")).toEqual({ given: "NoSurname", surname: "" });
  });

  it("normalises names for matching (initials and punctuation gone)", () => {
    expect(normaliseName("William H. Macartney")).toBe("william macartney");
    expect(normaliseName("O'Brien")).toBe("obrien");
  });

  it("reads years out of GEDCOM dates", () => {
    expect(yearOf("ABT JUN 1898")).toBe(1898);
    expect(yearOf(null)).toBeNull();
  });

  it("joins display names", () => {
    expect(displayName("Eileen", "McCartney")).toBe("Eileen McCartney");
  });
});

describe("parseGedcom", () => {
  const file = parseGedcom(SAMPLE);

  it("reads the header", () => {
    expect(file.charset).toBe("UTF-8");
    expect(file.sourceApp).toBe("Ancestry Family Trees");
  });

  it("parses people with events and links", () => {
    // The nameless @I4@ record is kept but flagged — commit-time skips it.
    expect(file.people).toHaveLength(4);
    const william = file.people[0];
    expect(william.fullName).toBe("William H Macartney");
    expect(william.sex).toBe("m");
    expect(william.birthDate).toBe("1871");
    expect(william.deathPlace).toBe("Plymouth, Devon");
    expect(william.fams).toEqual(["@F1@"]);
    // OCCU is preserved, not dropped.
    expect(william.unmapped.join(" ")).toContain("Railway porter");
  });

  it("collects second NAME lines as aliases", () => {
    const eileen = file.people.find((p) => p.fullName === "Eileen McCartney");
    expect(eileen?.aliases).toContain("Eileen Macartney");
  });

  it("flags nameless records rather than dropping them silently", () => {
    const bare = parseGedcom("0 HEAD\n1 CHAR UTF-8\n0 @I9@ INDI\n1 SEX M\n0 TRLR\n");
    expect(bare.parseNotes.join(" ")).toContain("no NAME");
    expect(bare.people).toHaveLength(1);
  });

  it("parses families with marriage details", () => {
    expect(file.families).toHaveLength(1);
    const fam = file.families[0];
    expect(fam.husband).toBe("@I1@");
    expect(fam.children).toEqual(["@I3@"]);
    expect(fam.marriageDate).toBe("25 DEC 1896");
    expect(fam.marriagePlace).toBe("Plymouth Registry");
  });
});

describe("duplicate matching", () => {
  const existing = [
    {
      id: 4,
      fullName: "Kathleen S Macartney",
      aliases: [],
      sex: "f" as const,
      birthDate: "1898",
    },
    {
      id: 6,
      fullName: "Mabel C Macartney",
      aliases: [],
      sex: "f" as const,
      birthDate: null,
    },
  ];

  it("scores exact name + year as a certain match", () => {
    const incoming = parseGedcom(SAMPLE).people[0];
    const score = scoreMatch(incoming, {
      id: 1,
      fullName: "William H Macartney",
      aliases: [],
      sex: "m",
      birthDate: "1871",
    });
    expect(score).toBeGreaterThanOrEqual(0.9);
    expect(defaultAction(score)).toBe("merge");
  });

  it("recommends create for unrelated people", () => {
    const matches = matchAll(
      [
        {
          xref: "@X1@",
          given: "Zaphod",
          surname: "Beeblebrox",
          fullName: "Zaphod Beeblebrox",
          sex: "x",
          birthDate: "3000",
          birthPlace: null,
          deathDate: null,
          deathPlace: null,
          famc: [],
          fams: [],
          aliases: [],
          unmapped: [],
        },
      ],
      existing,
    );
    expect(matches.get("@X1@")).toBeNull();
  });

  it("penalises sex mismatches", () => {
    const incoming = {
      xref: "@S1@",
      given: "Kathleen",
      surname: "Macartney",
      fullName: "Kathleen Macartney",
      sex: "m" as const,
      birthDate: "1898",
      birthPlace: null,
      deathDate: null,
      deathPlace: null,
      famc: [],
      fams: [],
      aliases: [],
      unmapped: [],
    };
    const scoreM = scoreMatch(incoming, existing[0]);
    const scoreF = scoreMatch({ ...incoming, sex: "f" }, existing[0]);
    expect(scoreF).toBeGreaterThan(scoreM);
  });
});

describe("export → parse round-trip", () => {
  const people: Person[] = [
    {
      id: 1,
      fullName: "William H Macartney",
      cluster: "family",
      nameNote: null,
      aliases: ["William H McCartney"],
      sex: "m",
      birthDate: "1871",
      birthPlace: "Plymouth",
      deathDate: null,
      deathPlace: null,
      notes: "immigrant line",
      living: false,
      createdBy: "seed",
      createdAt: 0,
    },
    {
      id: 2,
      fullName: "Edith Maude Grainger",
      cluster: "family",
      nameNote: null,
      aliases: [],
      sex: "f",
      birthDate: "1874",
      birthPlace: null,
      deathDate: "1924",
      deathPlace: null,
      notes: null,
      living: false,
      createdBy: "seed",
      createdAt: 0,
    },
  ];
  const unions: Union[] = [{ id: 9, cluster: "family", partnerA: 1, partnerB: 2, marriageDate: "1896", marriagePlace: "Plymouth", createdBy: "seed", createdAt: 0 }];
  const childLinks = [{ unionId: 9, personId: 2 }];
  const facts: Fact[] = [
    {
      id: 3,
      personId: 1,
      kind: "census",
      detail: "1881 census, Plymouth",
      source: "RG11/2201",
      sourceUrl: null,
      sourceKind: "primary",
      confidence: "documented",
      createdBy: "seed",
      createdAt: 0,
    },
    { id: 4, personId: 1, kind: "note", detail: "green leaf hint on Ancestry", source: null, sourceUrl: null, sourceKind: "unspecified", confidence: "guess", createdBy: "seed", createdAt: 0 },
  ];

  const ged = exportGedcom({ people, unions, childLinks, facts });
  const back = parseGedcom(ged);

  it("round-trips people, families and counts", () => {
    expect(back.people).toHaveLength(2);
    expect(back.families).toHaveLength(1);
    expect(back.people[0].fullName).toBe("William H Macartney");
    expect(back.people[0].aliases).toContain("William H McCartney");
    expect(back.people[0].sex).toBe("m");
    expect(back.people[0].birthPlace).toBe("Plymouth");
  });

  it("round-trips family structure", () => {
    const fam = back.families[0];
    expect(fam.marriageDate).toBe("1896");
    expect(fam.marriagePlace).toBe("Plymouth");
    const wifeXref = fam.wife;
    const wife = back.people.find((p) => p.xref === wifeXref);
    expect(wife?.fullName).toBe("Edith Maude Grainger");
    expect(fam.children).toContain(back.people[1].xref);
  });

  it("preserves fact text and free-text sources", () => {
    const william = back.people[0];
    expect(william.unmapped.join(" ")).toContain("1881 census, Plymouth");
    expect(william.unmapped.join(" ")).toContain("RG11/2201");
  });

  it("keeps xref syntax intact (no stray @ in text values)", () => {
    // Every xref line looks exactly like "N INDI @I<id>@" / "1 FAMS @F9@" etc.
    const xrefLines = ged.split("\n").filter((l) => l.includes("@"));
    expect(xrefLines.length).toBeGreaterThan(0);
    for (const l of xrefLines) {
      expect(l).toMatch(/^(0 @\w+@ (INDI|FAM)|1 (FAMS|FAMC|HUSB|WIFE|CHIL) @[IF]\d+@)$/);
    }
  });
});

describe("splitKinName", () => {
  it("takes the last token as surname", () => {
    expect(splitKinName("Kathleen S Macartney")).toEqual({ given: "Kathleen S", surname: "Macartney" });
    expect(splitKinName("Cher")).toEqual({ given: "Cher", surname: "" });
  });
});
