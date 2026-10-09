import { NextResponse } from "next/server";
import {
  allFacts,
  allPeople,
  getPerson,
  insertFact,
  insertPerson,
  logActivity,
  updatePerson,
  updateUnionMeta,
  allUnions,
} from "@/lib/db";
import {
  matchAll,
  parseGedcom,
  yearOf,
  type DuplicateMatch,
  type GedcomFile,
  type MatchAction,
} from "@/lib/gedcom";
import { Forbidden, forbiddenResponse, Unauthorized, unauthorizedResponse, requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — far beyond any family tree file

interface PlanEntry {
  xref: string;
  name: string;
  action: MatchAction;
  mergeInto: number | null;
  mergeName: string | null;
  score: number;
  birthYear: number | null;
}

interface CommitCounts {
  created: number;
  merged: number;
  skipped: number;
  factsAdded: number;
  namelessSkipped: number;
}

type ImportPlan = {
  charset: string;
  sourceApp: string | null;
  parseNotes: string[];
  people: PlanEntry[];
  families: { xref: string; husband: string | null; wife: string | null; children: number; marriageDate: string | null; marriagePlace: string | null }[];
  totals: { in: number; merge: number; create: number; skip: number };
};

function buildPlan(file: GedcomFile, existingPeople: Awaited<ReturnType<typeof allPeople>>): ImportPlan {
  const named = file.people.filter((p) => p.fullName);
  const matches = matchAll(named, existingPeople);
  const plan: ImportPlan = {
    charset: file.charset,
    sourceApp: file.sourceApp,
    parseNotes: file.parseNotes,
    people: [],
    families: [],
    totals: { in: named.length, merge: 0, create: 0, skip: 0 },
  };
  for (const p of named) {
    const m = matches.get(p.xref) ?? null;
    const action: MatchAction = m ? m.suggested : "create";
    plan.people.push({
      xref: p.xref,
      name: p.fullName,
      action,
      mergeInto: action === "merge" && m ? m.existingId : null,
      mergeName: action === "merge" && m ? m.existingName : null,
      score: m ? m.score : 0,
      birthYear: yearOf(p.birthDate),
    });
    plan.totals[action === "merge" ? "merge" : "create"] += 1;
  }
  plan.totals.skip = file.people.length - named.length;
  plan.families = file.families.map((f) => ({
    xref: f.xref,
    husband: f.husband,
    wife: f.wife,
    children: f.children.length,
    marriageDate: f.marriageDate,
    marriagePlace: f.marriagePlace,
  }));
  return plan;
}

export async function POST(req: Request) {
  try {
    await requireOwner();
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const gedcomText = String(body.gedcom ?? "");
    if (!gedcomText.trim()) {
      return NextResponse.json({ error: "gedcom text is required" }, { status: 400 });
    }
    if (gedcomText.length > MAX_BYTES) {
      return NextResponse.json({ error: "file too large (8 MB limit)" }, { status: 413 });
    }
    if (!/0\s+HEAD/.test(gedcomText)) {
      return NextResponse.json({ error: "not a GEDCOM file (no 0 HEAD record)" }, { status: 400 });
    }

    const file = parseGedcom(gedcomText);
    const existingPeople = await allPeople();

    // ---- preview mode: parse + match only, nothing written --------------
    if (body.confirm !== true) {
      return NextResponse.json({ ok: true, plan: buildPlan(file, existingPeople) });
    }

    // ---- commit mode: write according to the plan ------------------------
    const decisions = new Map<string, MatchAction>();
    if (Array.isArray(body.actions)) {
      for (const a of body.actions as Record<string, unknown>[]) {
        const xref = String(a.xref ?? "");
        const action = String(a.action ?? "") as MatchAction;
        if (xref && (action === "create" || action === "merge" || action === "skip")) {
          decisions.set(xref, action);
        }
      }
    }

    const matches = matchAll(file.people.filter((p) => p.fullName), existingPeople);
    const counts: CommitCounts = { created: 0, merged: 0, skipped: 0, factsAdded: 0, namelessSkipped: file.people.length - file.people.filter((p) => p.fullName).length };
    const now = Date.now();
    /** GEDCOM xref → kin person id (created or merged-into). */
    const idMap = new Map<string, number>();
    /** GEDCOM xref → union id for FAMS the person participated in. */
    const createdPersonIds: number[] = [];

    for (const p of file.people) {
      if (!p.fullName) {
        counts.skipped += 1;
        continue;
      }
      const action = decisions.get(p.xref) ?? matches.get(p.xref)?.suggested ?? "create";

      if (action === "skip") {
        counts.skipped += 1;
        continue;
      }

      if (action === "merge") {
        const m = matches.get(p.xref);
        if (!m) {
          counts.skipped += 1;
          continue;
        }
        const target = await getPerson(m.existingId);
        if (!target) {
          counts.skipped += 1;
          continue;
        }
        // Only write when the incoming record actually adds something.
        const newDates =
          (p.birthDate && !target.birthDate) ||
          (p.birthPlace && !target.birthPlace) ||
          (p.deathDate && !target.deathDate) ||
          (p.deathPlace && !target.deathPlace);
        const newSex = Boolean(!target.sex && p.sex);
        const newAliases = [...p.aliases, ...(p.fullName !== target.fullName ? [p.fullName] : [])].filter(
          (a) => !target.aliases.includes(a),
        );
        const hasNewData = newDates || newSex || newAliases.length > 0;
        if (hasNewData) {
          const notes = p.unmapped.length ? `${target.notes ?? ""}${target.notes ? "\n" : ""}[GEDCOM import ${p.xref}] ${p.unmapped.join("; ")}`.trim() : target.notes;
          await updatePerson(m.existingId, {
            ...target,
            birthDate: target.birthDate ?? p.birthDate,
            birthPlace: target.birthPlace ?? p.birthPlace,
            deathDate: target.deathDate ?? p.deathDate,
            deathPlace: target.deathPlace ?? p.deathPlace,
            sex: target.sex ?? p.sex,
            aliases: [...new Set([...target.aliases, ...newAliases])],
            notes,
          });
        }
        idMap.set(p.xref, m.existingId);
        counts.merged += 1;
        continue;
      }

      // create
      const person = await insertPerson(
        {
          fullName: p.fullName,
          nameNote: null,
          aliases: p.aliases,
          sex: p.sex,
          birthDate: p.birthDate,
          birthPlace: p.birthPlace,
          deathDate: p.deathDate,
          deathPlace: p.deathPlace,
          notes: p.unmapped.length ? `[GEDCOM import ${p.xref}] ${p.unmapped.join("; ")}` : null,
          living: false,
          createdBy: "gedcom",
        },
        now,
      );
      idMap.set(p.xref, person.id);
      createdPersonIds.push(person.id);
      counts.created += 1;
    }

    // Families: connect FAM links using idMap, via each person's FAMS/FAMC lists.
    const unions = await allUnions();
    for (const f of file.families) {
      const husbId = f.husband ? idMap.get(f.husband) : undefined;
      const wifeId = f.wife ? idMap.get(f.wife) : undefined;
      if (husbId === undefined && wifeId === undefined) continue;

      // Find an existing union between the two (either orientation).
      let unionId: number | null = null;
      for (const u of unions) {
        const pairMatch =
          (u.partnerA === husbId && u.partnerB === wifeId) ||
          (u.partnerA === wifeId && u.partnerB === husbId) ||
          (u.partnerA === husbId && wifeId === undefined) ||
          (u.partnerA === wifeId && husbId === undefined);
        if (pairMatch) {
          unionId = u.id;
          break;
        }
      }

      if (unionId === null) {
        // Create a new union — only when at least one parent exists in kin.
        if (husbId === undefined || wifeId === undefined) {
          // single-parent family: create a one-partner union
          const solo = husbId ?? wifeId;
          if (solo === undefined) continue;
          const created = await (await import("@/lib/db")).insertUnion(
            { partnerA: solo, partnerB: null, marriageDate: f.marriageDate, marriagePlace: f.marriagePlace, createdBy: "gedcom" },
            now,
          );
          unionId = created.id;
          unions.push(created);
        } else {
          const created = await (await import("@/lib/db")).insertUnion(
            { partnerA: husbId as number, partnerB: wifeId as number, marriageDate: f.marriageDate, marriagePlace: f.marriagePlace, createdBy: "gedcom" },
            now,
          );
          unionId = created.id;
          unions.push(created);
        }
      } else {
        await updateUnionMeta(unionId, { marriageDate: f.marriageDate, marriagePlace: f.marriagePlace });
      }

      for (const childXref of f.children) {
        const childId = idMap.get(childXref);
        if (childId !== undefined) {
          await (await import("@/lib/db")).addChild(unionId, childId);
        }
      }
    }

    // Facts for created people: birth/death as facts? No — those live on the
    // person row. Keep a single provenance fact so the origin is visible.
    for (const pid of createdPersonIds) {
      await insertFact(
        {
          personId: pid,
          kind: "note",
          detail: `Imported from ${file.sourceApp ?? "GEDCOM file"} (${new Date().toISOString().slice(0, 10)})`,
          source: null,
          sourceUrl: null,
          sourceKind: "secondary",
          confidence: "likely",
          createdBy: "gedcom",
        },
        now,
      );
      counts.factsAdded += 1;
    }

    await logActivity(
      "GEDCOM import",
      "imported into",
      "the family tree",
      `${counts.created} new people, ${counts.merged} merged, ${counts.skipped} skipped${file.sourceApp ? ` (from ${file.sourceApp})` : ""}`,
      now,
    );

    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    if (e instanceof Forbidden) return forbiddenResponse();
    console.error("import failed:", e);
    return NextResponse.json({ error: "import failed — see server logs" }, { status: 500 });
  }
}
