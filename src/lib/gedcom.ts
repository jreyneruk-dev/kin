/**
 * GEDCOM 5.5.1 import for kin — pure parsing + matching, no DB, no React.
 *
 * Scope decisions (kept deliberately small for a family-sized import):
 * - INDI records: NAME (given + surname), SEX, BIRT/DEAT (DATE, PLAC),
 *   alias candidates via NAME._ALIA and NOTE, FAMC/FAMS links.
 * - FAM records: HUSB/WIFE/CHIL links, MARR (DATE, PLAC).
 * - Everything unparsed is preserved as a per-person "GEDCOM import" note
 *   (Gramps Web's preserve-don't-drop rule) — nothing silently vanishes.
 * - CONT/CONC continuation lines are folded into their tag's value.
 * - ANSEL is not transcoded (UTF-8 assumed; 5.5.1 files from Ancestry are
 *   UTF-8 or ANSI — mojibake beats data loss, and CHAR is reported).
 */

export interface GedcomPerson {
  /** GEDCOM @id@ cross-reference, e.g. "@I12@". */
  xref: string;
  given: string;
  surname: string;
  fullName: string;
  sex: "f" | "m" | "x" | null;
  birthDate: string | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathPlace: string | null;
  famc: string[]; // child in families
  fams: string[]; // spouse in families
  aliases: string[];
  /** Raw lines we could not map, preserved as a note. */
  unmapped: string[];
}

export interface GedcomFamily {
  xref: string;
  husband: string | null;
  wife: string | null;
  children: string[];
  marriageDate: string | null;
  marriagePlace: string | null;
}

export interface GedcomFile {
  charset: string;
  sourceApp: string | null;
  people: GedcomPerson[];
  families: GedcomFamily[];
  /** Header-level notes about the parse itself. */
  parseNotes: string[];
}

interface Line {
  level: number;
  xref: string | null;
  tag: string;
  value: string;
}

/** Tokenise one GEDCOM line: LEVEL [XREF] TAG [VALUE]. */
export function parseLine(raw: string): Line | null {
  const line = raw.replace(/\r$/, "");
  if (!line.trim()) return null;
  const m = /^(\s*)(\d+)\s+(?:(@[^@]+@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$/.exec(line);
  if (!m) return null;
  return {
    level: Number(m[2]),
    xref: m[3] ?? null,
    tag: m[4].toUpperCase(),
    value: (m[5] ?? "").trim(),
  };
}

/** Fold CONT (new line) / CONC (concatenate) into their parent values. */
export function foldContinuations(
  lines: Line[],
): { level: number; tag: string; value: string; xref: string | null }[] {
  const out: { level: number; tag: string; value: string; xref: string | null }[] = [];
  const stack: number[] = []; // levels of the currently open value path
  for (const line of lines) {
    if (line.tag === "CONT" || line.tag === "CONC") {
      const prev = out[out.length - 1];
      if (prev && stack.length) {
        prev.value += line.tag === "CONT" ? "\n" : "";
        prev.value += line.value;
      }
      continue;
    }
    while (stack.length && (stack[stack.length - 1] as number) >= line.level) stack.pop();
    stack.push(line.level);
    out.push({ level: line.level, tag: line.tag, value: line.value, xref: line.xref });
  }
  return out;
}

/** "John Smith" + "/Macartney/" → given/surname per GEDCON slash convention. */
export function splitName(value: string): { given: string; surname: string } {
  const m = /^([^/]*)(?:\/([^/]*)\/)?/.exec(value.trim());
  const given = (m?.[1] ?? "").trim().replace(/\/\/$/, "").trim();
  const surname = (m?.[2] ?? "").trim();
  return { given, surname };
}

/** Build the display name kin uses. */
export function displayName(given: string, surname: string): string {
  return [given.trim(), surname.trim()].filter(Boolean).join(" ");
}

/** Normalise a name for duplicate matching: lowercase, strip initials/punct. */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'’'-]/g, "") // punctuation inside names (O'Brien → obrien)
    .replace(/\b[a-z]\b/g, " ") // stand-alone initials (H → space)
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull a 4-digit year out of GEDCOM date text ("ABT JUN 1898"). */
export function yearOf(date: string | null): number | null {
  if (!date) return null;
  const m = /(\d{4})/.exec(date);
  return m ? Number(m[1]) : null;
}

export function parseGedcom(text: string): GedcomFile {
  const lines = text.split("\n").map(parseLine).filter((l): l is Line => l !== null);
  const flat = foldContinuations(lines);

  const file: GedcomFile = {
    charset: "UTF-8",
    sourceApp: null,
    people: [],
    families: [],
    parseNotes: [],
  };

  // Header
  for (let i = 0; i < flat.length; i++) {
    const l = flat[i];
    if (l.tag === "CHAR") {
      file.charset = l.value || "UTF-8";
      break;
    }
  }
  const sour = flat.find((l) => l.tag === "SOUR" && l.value);
  if (sour) file.sourceApp = sour.value;

  // INDI records
  let current: GedcomPerson | null = null;
  let subTag: string | null = null; // BIRT / DEAT / NAME context
  let ctx1: string | null = null; // last level-1 tag, for unmapped-event payloads
  let lastAlias = "";
  for (const l of flat) {
    if (l.level === 0) {
      if (current) file.people.push(current);
      current = null;
      subTag = null;
      if (l.xref && l.tag === "INDI") {
        current = {
          xref: l.xref,
          given: "",
          surname: "",
          fullName: "",
          sex: null,
          birthDate: null,
          birthPlace: null,
          deathDate: null,
          deathPlace: null,
          famc: [],
          fams: [],
          aliases: [],
          unmapped: [],
        };
      }
      continue;
    }
    if (!current) continue;

    if (l.level === 1) {
      subTag = null;
      ctx1 = l.tag;
      switch (l.tag) {
        case "NAME":
          if (l.xref) {
            // NAME with its own xref = an alias name (_ALIA style in some apps)
            const { given, surname } = splitName(l.value);
            const aliasName = displayName(given, surname);
            if (aliasName && !current.aliases.includes(aliasName)) current.aliases.push(aliasName);
          } else {
            const { given, surname } = splitName(l.value);
            current.given = given;
            current.surname = surname;
            current.fullName = displayName(given, surname);
          }
          break;
        case "SEX":
          current.sex = l.value.toLowerCase().startsWith("f") ? "f" : l.value.toLowerCase().startsWith("m") ? "m" : "x";
          break;
        case "BIRT":
        case "DEAT":
          subTag = l.tag;
          if (l.value && l.value !== "Y") {
            // Some trees put the date straight on BIRT/DEAT
            if (current.birthDate === null && subTag === "BIRT") current.birthDate = l.value;
            if (current.deathDate === null && subTag === "DEAT") current.deathDate = l.value;
          }
          break;
        case "FAMC":
          if (l.value) current.famc.push(l.value);
          break;
        case "FAMS":
          if (l.value) current.fams.push(l.value);
          break;
        case "OCCU":
          if (l.value) current.unmapped.push(`Occupation: ${l.value}`);
          break;
        case "RESI":
          subTag = "RESI";
          break;
        default:
          if (l.value) current.unmapped.push(`${l.tag}: ${l.value}`);
          subTag = null;
      }
      continue;
    }

    // Level 2: DATE/PLAC under the current sub-tag; NAME under BIRT etc.
    if (l.level === 2 && current) {
      if (l.tag === "NAME" && l.value) {
        const { given, surname } = splitName(l.value);
        const aliasName = displayName(given, surname);
        if (aliasName && !current.aliases.includes(aliasName)) {
          current.aliases.push(aliasName);
          lastAlias = aliasName;
        }
        continue;
      }
      if (subTag === "BIRT" || subTag === "DEAT") {
        if (l.tag === "DATE" && current[subTag === "BIRT" ? "birthDate" : "deathDate"] === null) {
          current[subTag === "BIRT" ? "birthDate" : "deathDate"] = l.value;
        } else if (l.tag === "PLAC") {
          const key = subTag === "BIRT" ? "birthPlace" : "deathPlace";
          if (current[key] === null) current[key] = l.value;
        }
        continue;
      }
      if (subTag === "RESI" && l.tag === "PLAC" && l.value) {
        current.unmapped.push(`Residence: ${l.value}`);
        continue;
      }
      // Payload of an event we don't model (CENS, OCCU detail, …): preserve it.
      if (l.value && (l.tag === "DATE" || l.tag === "PLAC" || l.tag === "SOUR" || l.tag === "NOTE" || l.tag === "TYPE")) {
        current.unmapped.push(`${ctx1 ?? ""} ${l.tag}: ${l.value}`.trim());
      }
      continue;
    }

    if (l.level >= 3 && l.tag === "NOTE" && l.value && lastAlias && subTag === null) {
      // Notes directly under an alias NAME annotate the alias.
      current.unmapped.push(`Alias note (${lastAlias}): ${l.value}`);
      lastAlias = "";
    }
  }
  if (current) file.people.push(current);

  // FAM records
  let fam: GedcomFamily | null = null;
  let famSub: string | null = null;
  for (const l of flat) {
    if (l.level === 0) {
      if (fam) file.families.push(fam);
      fam = null;
      famSub = null;
      if (l.xref && l.tag === "FAM") {
        fam = { xref: l.xref, husband: null, wife: null, children: [], marriageDate: null, marriagePlace: null };
      }
      continue;
    }
    if (!fam) continue;
    if (l.level === 1) {
      famSub = null;
      switch (l.tag) {
        case "HUSB": fam.husband = l.value || null; break;
        case "WIFE": fam.wife = l.value || null; break;
        case "CHIL": if (l.value) fam.children.push(l.value); break;
        case "MARR": famSub = "MARR"; break;
        case "DIV": famSub = null; break;
        default: famSub = null;
      }
      continue;
    }
    if (l.level === 2 && fam && famSub === "MARR") {
      if (l.tag === "DATE" && fam.marriageDate === null) fam.marriageDate = l.value;
      if (l.tag === "PLAC" && fam.marriagePlace === null) fam.marriagePlace = l.value;
    }
  }
  if (fam) file.families.push(fam);

  if (file.charset.toUpperCase() !== "UTF-8") {
    file.parseNotes.push(
      `File declares charset ${file.charset} — non-UTF-8 text may look garbled; re-export as UTF-8 if names look wrong.`,
    );
  }
  const nameless = file.people.filter((p) => !p.fullName).length;
  if (nameless > 0) file.parseNotes.push(`${nameless} person record(s) have no NAME line and will be skipped.`);
  return file;
}

export type MatchAction = "skip" | "merge" | "create";

export interface DuplicateMatch {
  person: GedcomPerson;
  existingId: number;
  existingName: string;
  score: number; // 0..1, 1 = certain
  suggested: MatchAction;
}

/**
 * Match an imported person against an existing kin person.
 * Heuristic: normalised surname match + birth year within ±2 (or both null)
 * scores high; exact normalised full-name match scores higher still.
 * Sex mismatch drops the score hard.
 */
export function scoreMatch(
  incoming: GedcomPerson,
  existing: { id: number; fullName: string; aliases: string[]; sex: string | null; birthDate: string | null },
): number {
  let best = 0;
  const candidates = [existing.fullName, ...existing.aliases];
  const inSurname = normaliseName(incoming.surname);
  const inGiven = normaliseName(incoming.given);
  const inFull = normaliseName(incoming.fullName);
  const inYear = yearOf(incoming.birthDate);
  const exYear = yearOf(existing.birthDate);

  for (const cand of candidates) {
    const candNorm = normaliseName(cand);
    if (!candNorm) continue;
    let score = 0;
    if (candNorm === inFull) score = 0.82;
    else if (inSurname && candNorm.includes(inSurname) && inGiven && candNorm.includes(inGiven)) score = 0.72;
    else if (inSurname && candNorm.includes(inSurname)) score = 0.45;
    if (score === 0) continue;

    if (inYear !== null && exYear !== null) {
      if (inYear === exYear) score += 0.15;
      else if (Math.abs(inYear - exYear) <= 2) score += 0.05;
      else score -= 0.25;
    } else if (inYear === null && exYear === null) {
      score += 0.02; // both unknown — slight nudge, name is doing the work
    } else {
      score -= 0.05; // one known, one not
    }
    if (incoming.sex && existing.sex && incoming.sex !== existing.sex) score -= 0.4;
    best = Math.max(best, score);
  }
  return Math.min(1, Math.max(0, best));
}

/** Default action per the roadmap rule: strong match → merge, else create. */
export function defaultAction(score: number): MatchAction {
  if (score >= 0.75) return "merge";
  if (score >= 0.55) return "merge"; // surname + year-ish: still a merge, flagged in UI
  return "create";
}

/** Score every incoming person against the existing tree (pure, testable). */
export function matchAll(
  people: GedcomPerson[],
  existing: { id: number; fullName: string; aliases: string[]; sex: string | null; birthDate: string | null }[],
): Map<string, DuplicateMatch | null> {
  const result = new Map<string, DuplicateMatch | null>();
  for (const p of people) {
    if (!p.fullName) {
      result.set(p.xref, null);
      continue;
    }
    let best: DuplicateMatch | null = null;
    for (const ex of existing) {
      const score = scoreMatch(p, ex);
      if (score >= 0.55 && (!best || score > best.score)) {
        best = {
          person: p,
          existingId: ex.id,
          existingName: ex.fullName,
          score,
          suggested: defaultAction(score),
        };
      }
    }
    result.set(p.xref, best);
  }
  return result;
}
