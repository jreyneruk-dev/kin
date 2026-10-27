import { describe, expect, it } from "vitest";
import {
  COMPARISON_VERDICT,
  allSources,
  entryIndex,
  familyLine,
  henryCandidates,
  lissanoureLine,
  nextRecords,
  parishLane,
  reasons,
  timeline,
} from "../src/lib/macartney-lines";

const isHttp = (url: string) => url.startsWith("https://") || url.startsWith("http://");

describe("the two lines stay separate", () => {
  it("has unique keys and no key appears in two lanes", () => {
    const all = [...lissanoureLine(), ...familyLine(), ...parishLane()];
    const keys = all.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(entryIndex().size).toBe(keys.length);
  });

  it("never marks a family or parish entry as a documented Lissanoure ancestor", () => {
    expect(lissanoureLine().every((e) => e.evidence === "documented" || e.evidence === "pedigree")).toBe(true);
    expect(parishLane().every((e) => e.evidence === "context" || e.evidence === "candidate")).toBe(true);
  });

  it("has exactly one candidate for Henry and it is the earliest family row", () => {
    const candidates = familyLine().filter((e) => e.evidence === "candidate");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].key).toBe("henry");
    expect(familyLine()[0].key).toBe("henry");
  });

  it("has no field claiming a proven link", () => {
    const text = [...lissanoureLine(), ...familyLine(), ...parishLane()]
      .map((e) => `${e.name} ${e.note} ${e.role}`)
      .join(" ")
      .toLowerCase();
    expect(text).not.toContain("descended from the earl");
    expect(text).not.toContain("proven link");
    expect(COMPARISON_VERDICT.toLowerCase()).toContain("no record joins");
  });
});

describe("sourcing", () => {
  it("gives every person at least one http source", () => {
    for (const entry of [...lissanoureLine(), ...familyLine(), ...parishLane()]) {
      expect(entry.sources.length, entry.key).toBeGreaterThan(0);
      expect(entry.sources.every((s) => isHttp(s.url)), entry.key).toBe(true);
    }
  });

  it("deduplicates the source panel by URL", () => {
    const urls = allSources().map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBeGreaterThanOrEqual(15);
  });

  it("gives every next record a place and a URL", () => {
    const records = nextRecords();
    expect(records.length).toBeGreaterThanOrEqual(6);
    for (const record of records) {
      expect(record.record.length).toBeGreaterThan(10);
      expect(record.gives.length).toBeGreaterThan(20);
      expect(record.where.length).toBeGreaterThan(5);
      if (record.url !== null) expect(isHttp(record.url)).toBe(true);
    }
    expect(records.filter((r) => r.url !== null).length).toBeGreaterThanOrEqual(5);
  });

  it("lists seven reasons, each with a title and a substantial detail", () => {
    const list = reasons();
    expect(list).toHaveLength(7);
    for (const reason of list) {
      expect(reason.title.length).toBeGreaterThan(15);
      expect(reason.detail.length).toBeGreaterThan(80);
    }
  });
});

describe("timeline", () => {
  it("is chronological", () => {
    const years = timeline().map((row) => row.sortYear);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
  });

  it("resolves every key and uses each key at most twice", () => {
    const index = entryIndex();
    const used = new Map<string, number>();
    for (const row of timeline()) {
      for (const key of [...row.lissanoure, ...row.family, ...row.parish]) {
        expect(index.has(key), key).toBe(true);
        used.set(key, (used.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of used) expect(count, key).toBeLessThanOrEqual(2);
  });

  it("shows the family's silence before Henry — the gap is the finding", () => {
    const early = timeline().filter((row) => row.sortYear <= 1806);
    expect(early.length).toBeGreaterThanOrEqual(4);
    for (const row of early) expect(row.family, row.era).toHaveLength(0);
  });

  it("puts the Earl and the 1943 line-end on the Lissanoure side", () => {
    const index = entryIndex();
    const rows = timeline();
    const earlRow = rows.find((row) => row.lissanoure.includes("earl"));
    expect(earlRow?.sortYear).toBe(1737);
    const lastRow = rows.at(-1);
    expect(lastRow?.lissanoure).toContain("lucy");
    expect(index.get("lucy")?.dates).toContain("1943");
  });
});

describe("the four Henry candidates", () => {
  it("lists exactly four, with one best fit in Cromkill", () => {
    const candidates = henryCandidates();
    expect(candidates).toHaveLength(4);
    expect(candidates.filter((c) => c.fit === "best")).toHaveLength(1);
    const best = candidates.find((c) => c.fit === "best");
    expect(best?.townland).toBe("Cromkill");
    expect(best?.parish).toBe("Connor");
    expect(best?.county).toBe("Antrim");
    expect(best?.setting).toBe("rural");
  });

  it("records county, parish, townland and a source for each", () => {
    for (const candidate of henryCandidates()) {
      expect(candidate.county.length).toBeGreaterThan(2);
      expect(candidate.parish.length).toBeGreaterThan(2);
      expect(candidate.townland.length).toBeGreaterThan(2);
      expect(isHttp(candidate.source.url)).toBe(true);
      expect(candidate.note.length).toBeGreaterThan(40);
    }
  });

  it("does not present any candidate as proved", () => {
    for (const candidate of henryCandidates()) {
      expect(candidate.note.toLowerCase()).not.toContain("is our henry");
      expect(candidate.note.toLowerCase()).not.toContain("proves");
    }
  });
});
