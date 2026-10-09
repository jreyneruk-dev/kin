/**
 * Cluster isolation — the invariant the whole two-cluster design exists for.
 *
 * Runs against a real Postgres (embedded, no Docker, production schema) because
 * the guarantee lives in the SQL: the family tree, the people list, the search
 * behind it and the GEDCOM export must return family rows only, and the
 * documented Macartneys of Lissanoure must be reachable through the cluster
 * selector and by nothing else.
 *
 * If one seeded Lissanoure row ever appears in the default people or union
 * feeds, the first tests here fail — that is the point of the pass.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import EmbeddedPostgres from "embedded-postgres";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { parseGedcom } from "../src/lib/gedcom";
import {
  lissanoureChildren,
  lissanourePeople,
  lissanoureUnions,
} from "../src/lib/seed-lissanoure-data";

const PG_PORT = 5496;
const dataDir = mkdtempSync(join(tmpdir(), "kin-cluster-pg-"));

const FAMILY_PEOPLE = ["Family Root", "Family Spouse", "Family Child"];
const EARL = "George Macartney, 1st Earl Macartney";
const LISSANOURE = "lissanoure";

let pg: InstanceType<typeof EmbeddedPostgres> | null = null;
let client: ReturnType<typeof postgres> | null = null;
let db: typeof import("../src/lib/db");
let gedcomFor: typeof import("../src/lib/export-cluster").gedcomFor;
const familyIds: Record<string, number> = {};

async function earlId(): Promise<number> {
  const people = await db.allPeople(LISSANOURE);
  const earl = people.find((p) => p.fullName === EARL);
  if (!earl) throw new Error("the Earl is not in the seeded cluster");
  return earl.id;
}

beforeAll(async () => {
  pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "password",
    port: PG_PORT,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("kin");
  process.env.DATABASE_URL = `postgres://postgres:password@localhost:${PG_PORT}/kin`;

  client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
  await client.unsafe(readFileSync(resolve(process.cwd(), "src/lib/schema.sql"), "utf8"));

  // A minimal family tree: two parents, one child.
  const addFamilyPerson = async (fullName: string) => {
    const rows = await client!`
      INSERT INTO people (full_name, cluster, death_date, living, created_by, created_at)
      VALUES (${fullName}, 'family', '1900', false, 'test', 0)
      RETURNING id
    `;
    return Number(rows[0].id);
  };
  familyIds.root = await addFamilyPerson(FAMILY_PEOPLE[0]);
  familyIds.spouse = await addFamilyPerson(FAMILY_PEOPLE[1]);
  familyIds.child = await addFamilyPerson(FAMILY_PEOPLE[2]);

  const unionRows = await client`
    INSERT INTO unions (partner_a, partner_b, cluster, marriage_date, created_by, created_at)
    VALUES (${familyIds.root}, ${familyIds.spouse}, 'family', '1890', 'test', 0)
    RETURNING id
  `;
  familyIds.union = Number(unionRows[0].id);
  await client`
    INSERT INTO children (union_id, person_id) VALUES (${familyIds.union}, ${familyIds.child})
  `;

  db = await import("../src/lib/db");
  ({ gedcomFor } = await import("../src/lib/export-cluster"));
}, 180_000);

afterAll(async () => {
  if (db) await db.closeDb();
  if (client) await client.end();
  if (pg) await pg.stop();
  rmSync(dataDir, { recursive: true, force: true });
}, 60_000);

describe("seeding the documented Lissanoure line", () => {
  it("writes the whole direct line into its own cluster, with sources", async () => {
    const { seedLissanoure } = await import("../src/lib/seed-lissanoure");
    const report = await seedLissanoure(client!);

    expect(report.strays).toEqual([]);
    expect(report.insertedPeople).toBe(lissanourePeople().length);
    expect(report.peopleInCluster).toBe(lissanourePeople().length);
    expect(report.insertedFacts).toBeGreaterThan(30);

    const people = await db.allPeople(LISSANOURE);
    expect(people).toHaveLength(lissanourePeople().length);
    expect(people.every((p) => p.cluster === LISSANOURE)).toBe(true);
    expect(people.map((p) => p.fullName)).toContain(EARL);

    const facts = await db.allFacts(LISSANOURE);
    expect(facts.length).toBeGreaterThanOrEqual(report.insertedFacts);
    expect(facts.every((f) => Boolean(f.source))).toBe(true);
    expect(facts.some((f) => Boolean(f.sourceUrl))).toBe(true);
  });

  it("is idempotent — a second run adds nothing", async () => {
    const { seedLissanoure } = await import("../src/lib/seed-lissanoure");
    const before = await db.clusterCounts();
    const report = await seedLissanoure(client!);

    expect(report.insertedPeople).toBe(0);
    expect(report.insertedUnions).toBe(0);
    expect(report.insertedChildLinks).toBe(0);
    expect(report.insertedFacts).toBe(0);
    expect(await db.clusterCounts()).toEqual(before);
  });
});

describe("the family feeds cannot see the research cluster", () => {
  it("returns family people only", async () => {
    const people = await db.allPeople();
    const names = people.map((p) => p.fullName).sort();

    expect(names).toEqual([...FAMILY_PEOPLE].sort());
    for (const seeded of lissanourePeople()) {
      expect(names).not.toContain(seeded.fullName);
    }
  });

  it("returns family unions and child links only", async () => {
    const unions = await db.allUnions();
    expect(unions.map((u) => u.id)).toEqual([familyIds.union]);
    expect(unions.every((u) => u.cluster === "family")).toBe(true);

    const links = await db.childLinks();
    expect(links).toEqual([{ unionId: familyIds.union, personId: familyIds.child }]);

    const facts = await db.allFacts();
    const familyFactPeople = new Set(facts.map((f) => f.personId));
    expect([...familyFactPeople].every((id) => Object.values(familyIds).includes(id))).toBe(true);
  });

  it("keeps the whole pedigree out of a default GEDCOM export", async () => {
    // Read it back with the app's own parser: a leaked person would come back as
    // a record, whatever the surname/given-name split did to the text.
    const ged = parseGedcom(await gedcomFor("family"));
    expect(ged.people.map((p) => p.fullName).sort()).toEqual([...FAMILY_PEOPLE].sort());
    for (const seeded of lissanourePeople()) {
      expect(ged.people.some((p) => p.fullName === seeded.fullName)).toBe(false);
    }
  });
});

describe("the cluster selector is the only way in", () => {
  it("reaches every seeded person through the cluster key", async () => {
    const people = await db.allPeople(LISSANOURE);
    const names = people.map((p) => p.fullName);
    for (const seeded of lissanourePeople()) {
      expect(names).toContain(seeded.fullName);
    }
    expect(names).not.toContain("Family Root");
    expect(await db.allUnions(LISSANOURE)).toHaveLength(lissanoureUnions().length);
    expect(await db.childLinks(LISSANOURE)).toHaveLength(lissanoureChildren().length);
  });

  it("exports the pedigree only when its cluster is asked for", async () => {
    const raw = await gedcomFor(LISSANOURE);
    expect(raw).toContain("d. 31 May 1806 at Chiswick"); // a sourced fact rides along

    const ged = parseGedcom(raw);
    const names = ged.people.map((p) => p.fullName);
    expect(names).toContain(EARL);
    expect(names).toHaveLength(lissanourePeople().length);
    expect(names).not.toContain("Family Root");
  });

  it("reports both clusters, so a selector can offer them", async () => {
    const counts = await db.clusterCounts();
    expect(counts).toContainEqual({ cluster: "family", people: FAMILY_PEOPLE.length, unions: 1 });
    const research = counts.find((c) => c.cluster === LISSANOURE);
    expect(research?.people).toBe(lissanourePeople().length);
    expect(research?.unions).toBe(lissanoureUnions().length);
  });
});

/** Declared last: these tests add rows to the research cluster. */
describe("writes cannot cross the boundary", () => {
  it("refuses to attach a research person to a family union", async () => {
    expect.assertions(1);
    try {
      await db.addChild(familyIds.union, await earlId());
    } catch (error) {
      expect(String(error)).toMatch(/cross-cluster/);
    }
  });

  it("puts a relative added from a research profile into that cluster", async () => {
    const { person } = await db.createPersonWithLink(
      {
        fullName: "Unnamed Macartney wife (test)",
        nameNote: null,
        aliases: [],
        sex: "f",
        birthDate: null,
        birthPlace: null,
        deathDate: null,
        deathPlace: null,
        notes: null,
        living: true,
        createdBy: "test",
      },
      Date.now(),
      { kind: "partner-of", partnerId: await earlId(), marriageDate: null, marriagePlace: null },
    );

    expect(person.cluster).toBe(LISSANOURE);
    expect((await db.allPeople()).some((p) => p.id === person.id)).toBe(false);
    expect((await db.allPeople(LISSANOURE)).some((p) => p.id === person.id)).toBe(true);
    const unions = await db.allUnions(LISSANOURE);
    expect(unions.some((u) => u.partnerB === person.id && u.cluster === LISSANOURE)).toBe(true);
  });
});

describe("the seeded pedigree holds together", () => {
  const keys = new Set(lissanourePeople().map((p) => p.key));

  it("gives every person at least one sourced fact", () => {
    for (const person of lissanourePeople()) {
      expect(person.facts.length).toBeGreaterThan(0);
      for (const fact of person.facts) {
        expect(fact.detail.trim().length).toBeGreaterThan(0);
        expect(fact.source.trim().length).toBeGreaterThan(0);
        expect(["primary", "secondary", "negative", "family-lore", "unspecified"]).toContain(
          fact.sourceKind,
        );
      }
    }
  });

  it("only links people that exist", () => {
    for (const union of lissanoureUnions()) {
      expect(keys.has(union.a)).toBe(true);
      if (union.b !== null) expect(keys.has(union.b)).toBe(true);
    }
    for (const link of lissanoureChildren()) {
      expect(keys.has(link.child)).toBe(true);
      expect(link.union).toBeLessThan(lissanoureUnions().length);
      expect(link.union).toBeGreaterThanOrEqual(0);
    }
  });

  it("records the Earl as childless — the load-bearing negative", () => {
    const earlUnion = lissanoureUnions().findIndex((u) => u.a === "earl" || u.b === "earl");
    expect(earlUnion).toBeGreaterThanOrEqual(0);
    expect(lissanoureChildren().some((c) => c.union === earlUnion)).toBe(false);
    // …while the line still reaches 1943 through his sister.
    const lastUnion = lissanoureUnions().findIndex((u) => u.a === "carthanach");
    expect(lissanoureChildren().some((c) => c.union === lastUnion && c.child === "george-travers-lucy")).toBe(true);
  });

  it("spans the direct line from the 1649 arrival to the last of the name", () => {
    const people = lissanourePeople();
    expect(people.some((p) => p.key === "george-1626" && p.birthPlace?.includes("Auchinleck"))).toBe(true);
    expect(people.some((p) => p.key === "george-travers-lucy" && p.deathDate === "1943-07-11")).toBe(true);
  });
});
