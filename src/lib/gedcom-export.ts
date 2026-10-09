/**
 * GEDCOM 5.5.1 export — kin's data out in a standard file (the backup valve).
 * Pure functions, no DB. Dates stay as free text; living people are included
 * because the file goes only to the signed-in owner.
 */

import type { Fact, Person, Union } from "./types";

function esc(value: string): string {
  return value.replace(/@/g, "@@").replace(/\n/g, "\nCONT ");
}

function line(level: number, tag: string, value?: string): string {
  return value === undefined ? `${level} ${tag}` : `${level} ${tag} ${value}`;
}

function xref(kind: "I" | "F", id: number): string {
  return `@${kind}${id}@`;
}

function xrefOf(kind: "I" | "F", id: number | null): string | null {
  return id === null ? null : xref(kind, id);
}

/**
 * Surname = last whitespace token; given = the rest. kin stores one display
 * name, so this split is a convention, not truth — it matches how the seed
 * and the tree page already reason about surnames.
 */
export function splitKinName(fullName: string): { given: string; surname: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return { given: fullName, surname: "" };
  return { given: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

function sexCode(sex: Person["sex"]): string | null {
  if (sex === "f") return "F";
  if (sex === "m") return "M";
  if (sex === "x") return "X";
  return null;
}

const FACT_TO_GEDCOM_EVENT: Record<string, string> = {
  birth: "BIRT",
  baptism: "BAPM",
  marriage: "MARR",
  death: "DEAT",
  burial: "BURI",
  residence: "RESI",
  emigration: "EMIG",
  occupation: "OCCU",
  census: "CENS",
  military: "MIL",
};

export interface ExportInput {
  people: Person[];
  unions: Union[];
  childLinks: { unionId: number; personId: number }[];
  facts: Fact[];
}

/**
 * Serialise kin's tree as a GEDCOM 5.5.1 document. Facts become individual
 * events; the free-text source rides along as SOUR text so nothing is lost
 * by other programs. Unions become FAM records with children links.
 */
export function exportGedcom(input: ExportInput): string {
  const out: string[] = [];
  const now = new Date();
  const dateStr = `${now.getDate()} ${now.toLocaleString("en-GB", { month: "short" }).toUpperCase()} ${now.getFullYear()}`;

  out.push(line(0, "HEAD"));
  out.push(line(1, "SOUR", "KIN"));
  out.push(line(2, "NAME", "Kin family tree"));
  out.push(line(2, "VERS", "1"));
  out.push(line(1, "DATE", dateStr));
  out.push(line(1, "CHAR", "UTF-8"));

  const factByPerson = new Map<number, Fact[]>();
  for (const f of input.facts) {
    const arr = factByPerson.get(f.personId) ?? [];
    arr.push(f);
    factByPerson.set(f.personId, arr);
  }

  for (const p of input.people) {
    out.push(line(0, xref("I", p.id), "INDI"));
    const { given, surname } = splitKinName(p.fullName);
    out.push(line(1, "NAME", `${given} /${surname}/`));
    for (const alias of p.aliases) {
      const a = splitKinName(alias);
      out.push(line(2, "NAME", `${a.given} /${a.surname}/`.trim(), ));
    }
    const sx = sexCode(p.sex);
    if (sx) out.push(line(1, "SEX", sx));

    const coreEvents: Array<[string, string | null, string | null]> = [];
    if (p.birthDate || p.birthPlace) coreEvents.push(["BIRT", p.birthDate, p.birthPlace]);
    if (!p.living && (p.deathDate || p.deathPlace)) coreEvents.push(["DEAT", p.deathDate, p.deathPlace]);
    for (const [tag, date, plac] of coreEvents) {
      out.push(line(1, tag));
      if (date) out.push(line(2, "DATE", esc(date)));
      if (plac) out.push(line(2, "PLAC", esc(plac)));
    }

    for (const u of input.unions) {
      if (u.partnerA === p.id) out.push(line(1, "FAMS", xref("F", u.id)));
      else if (u.partnerB === p.id) out.push(line(1, "FAMS", xref("F", u.id)));
    }
    for (const l of input.childLinks) {
      if (l.personId === p.id) out.push(line(1, "FAMC", xref("F", l.unionId)));
    }

    const facts = factByPerson.get(p.id) ?? [];
    for (const f of facts) {
      if (f.kind === "note") {
        out.push(line(1, "NOTE", esc(f.detail)));
        continue;
      }
      const tag = FACT_TO_GEDCOM_EVENT[f.kind];
      if (!tag) {
        out.push(line(1, "NOTE", esc(`${f.kind}: ${f.detail}`)));
        continue;
      }
      out.push(line(1, tag));
      out.push(line(2, "DATE", esc(f.detail)));
      if (f.source) out.push(line(2, "SOUR", esc(f.source)));
    }
    if (p.notes) out.push(line(1, "NOTE", esc(p.notes)));
    if (p.nameNote) out.push(line(1, "NOTE", esc(`Name note: ${p.nameNote}`)));
  }

  for (const u of input.unions) {
    out.push(line(0, xref("F", u.id), "FAM"));
    const husb = xrefOf("I", u.partnerA);
    const wife = xrefOf("I", u.partnerB);
    if (husb) out.push(line(1, "HUSB", husb));
    if (wife) out.push(line(1, "WIFE", wife));
    for (const l of input.childLinks) {
      if (l.unionId === u.id) out.push(line(1, "CHIL", xref("I", l.personId)));
    }
    if (u.marriageDate) {
      out.push(line(1, "MARR"));
      out.push(line(2, "DATE", esc(u.marriageDate)));
    }
    if (u.marriagePlace) {
      if (!u.marriageDate) out.push(line(1, "MARR"));
      out.push(line(2, "PLAC", esc(u.marriagePlace)));
    }
  }

  out.push("0 TRLR");
  return out.join("\n") + "\n";
}
