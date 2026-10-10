/**
 * The junction checklist — the open records behind the Henry Macartney
 * question (docs/henry-origin-2026-10-09.md).
 *
 * Runs the production schema on an embedded Postgres (like
 * test/cluster.test.ts) because the guarantees live in SQL: seeding is
 * idempotent by key, and a reading someone recorded survives every re-seed.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import EmbeddedPostgres from "embedded-postgres";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { junctionChecklist, MACARTNEY_SPELLINGS } from "../src/lib/checklist-data";
import {
  CHECKLIST_STATUSES,
  CHECKLIST_STATUS_LABEL,
  checklistProgress,
  groupChecklist,
  isRead,
  parseChecklistStatus,
} from "../src/lib/checklist";

const PG_PORT = 5494;
const dataDir = mkdtempSync(join(tmpdir(), "kin-checklist-pg-"));

let pg: InstanceType<typeof EmbeddedPostgres> | null = null;
let client: ReturnType<typeof postgres> | null = null;
let db: typeof import("../src/lib/db");

/** The three register images the memo links directly (the other two are not online). */
const REGISTER_IMAGE_URLS = [
  "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1873/020700/7263015.pdf",
  "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1883/06379/4831023.pdf",
  "https://www.irishgenealogy.ie/files/civil/deaths_returns/deaths_1892/06050/4723989.pdf",
];

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

  db = await import("../src/lib/db");
}, 180_000);

afterAll(async () => {
  if (db) await db.closeDb();
  if (client) await client.end();
  if (pg) await pg.stop();
  rmSync(dataDir, { recursive: true, force: true });
}, 60_000);

describe("the junction's open records", () => {
  it("lists the eight records the origin memo leaves open", () => {
    const items = junctionChecklist();
    expect(items).toHaveLength(8);
    expect(items.filter((i) => i.section === "Death registers")).toHaveLength(5);
    expect(items.filter((i) => i.section === "Land records")).toHaveLength(1);
    expect(items.filter((i) => i.section === "Church records")).toHaveLength(1);
    expect(items.filter((i) => i.section === "Census")).toHaveLength(1);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    for (const item of items) {
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.detail.trim().length).toBeGreaterThan(0);
      if (item.url) expect(item.url).toMatch(/^https:\/\//);
    }
  });

  it("links the three register images online and flags the two that are not", () => {
    const registers = junctionChecklist().filter((i) => i.section === "Death registers");
    const linked = registers.filter((i) => i.url !== null).map((i) => i.url);
    expect(linked.sort()).toEqual([...REGISTER_IMAGE_URLS].sort());

    const unlinked = registers.filter((i) => i.url === null);
    expect(unlinked).toHaveLength(2);
    for (const item of unlinked) expect(item.detail).toContain("No register image is online");
  });

  it("names every spelling for the valuation search, both counties", () => {
    const griffiths = junctionChecklist().find((i) => i.key === "griffiths-valuation");
    expect(griffiths).toBeDefined();
    for (const spelling of MACARTNEY_SPELLINGS) {
      expect(griffiths!.detail).toContain(spelling);
    }
    expect(griffiths!.detail).toContain("Co. Antrim");
    expect(griffiths!.detail).toContain("Co. Down");
  });
});

describe("checklist status rules", () => {
  it("parses only the five working statuses", () => {
    for (const status of CHECKLIST_STATUSES) {
      expect(parseChecklistStatus(status)).toBe(status);
      expect(CHECKLIST_STATUS_LABEL[status].length).toBeGreaterThan(0);
    }
    expect(CHECKLIST_STATUSES).toHaveLength(5);
    expect(parseChecklistStatus("done")).toBeNull();
    expect(parseChecklistStatus(undefined)).toBeNull();
  });

  it("counts a negative as read — a searched-empty result is a result", () => {
    const items = [
      { status: "found" as const },
      { status: "negative" as const },
      { status: "doing" as const },
      { status: "todo" as const },
      { status: "blocked" as const },
    ];
    expect(items.filter(isRead)).toHaveLength(2);
    expect(checklistProgress(items)).toEqual({ read: 2, total: 5, blocked: 1 });
  });

  it("groups rows by section, keeping first-appearance order", () => {
    const groups = groupChecklist([
      { section: "Death registers", title: "a" },
      { section: "Death registers", title: "b" },
      { section: "Census", title: "c" },
    ]);
    expect(groups.map((g) => g.section)).toEqual(["Death registers", "Census"]);
    expect(groups[0].items).toHaveLength(2);
  });
});

describe("seeding and working the checklist", () => {
  it("seeds every record as an open 'to do' row", async () => {
    const { seedJunctionChecklist } = await import("../src/lib/seed-checklist");
    const report = await seedJunctionChecklist(client!);
    expect(report).toEqual({
      inserted: junctionChecklist().length,
      refreshed: 0,
      total: junctionChecklist().length,
    });

    const items = await db.checklistItems();
    expect(items.map((i) => i.key)).toEqual(junctionChecklist().map((r) => r.key));
    expect(items.every((i) => i.status === "todo")).toBe(true);
    expect(items.every((i) => i.note === "" && i.updatedBy === null && i.updatedAt === null)).toBe(
      true,
    );
  });

  it("records what a human read found, who read it and when", async () => {
    const target = (await db.checklistItems()).find((i) => i.key === "death-1873-belfast");
    expect(target).toBeDefined();
    const updated = await db.updateChecklistItem(
      target!.id,
      { status: "negative", note: "occupation: labourer — not our farmer" },
      "John",
      1_760_000_000_000,
    );
    expect(updated?.status).toBe("negative");
    expect(updated?.note).toContain("labourer");
    expect(updated?.updatedBy).toBe("John");
    expect(updated?.updatedAt).toBe(1_760_000_000_000);

    expect(
      await db.updateChecklistItem(999_999, { status: "todo", note: "" }, "John", 0),
    ).toBeNull();
  });

  it("re-seeding refreshes wording without clobbering a reading", async () => {
    const { seedJunctionChecklist } = await import("../src/lib/seed-checklist");
    const report = await seedJunctionChecklist(client!);
    expect(report.inserted).toBe(0);
    expect(report.refreshed).toBe(junctionChecklist().length);

    const target = (await db.checklistItems()).find((i) => i.key === "death-1873-belfast");
    expect(target?.status).toBe("negative");
    expect(target?.note).toContain("labourer");
    expect(target?.updatedBy).toBe("John");
  });
});
