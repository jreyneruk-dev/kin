"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface BoardPerson {
  id: number;
  fullName: string;
  dates: string;
  sex: string | null;
  living: boolean;
  /** Sourced facts on this person — shown only when a board supplies it. */
  sources?: number;
}

export interface BoardUnion {
  id: number;
  a: number;
  b: number | null;
}

interface Props {
  generations: { level: number; people: BoardPerson[] }[];
  unions: BoardUnion[];
  branches: string[];
  /** "family" (default) names the rows for the Macartney tree; "generations"
   * numbers them plainly, which is all a research line's board can honestly
   * claim (a 1626 row is nobody's "great-grandparents"). */
  variant?: "family" | "generations";
}

const LEVEL_LABEL = (level: number): string =>
  level === 0
    ? "Great-grandparents"
    : level === 1
      ? "Grandparents' generation"
      : level === 2
        ? "Parents' generation"
        : `Generation +${level - 2}`;

const PLAIN_LEVEL_LABEL = (level: number): string => `Generation ${level + 1}`;

export function TreeBoard({ generations, unions, branches, variant = "family" }: Props) {
  const [branch, setBranch] = useState<string>("all");

  const filtered = useMemo(() => {
    if (branch === "all") return generations;
    return generations.map((g) => ({
      ...g,
      people: g.people.filter((p) => p.fullName.endsWith(branch)),
    }));
  }, [generations, branch]);

  const isEmpty = filtered.every((g) => g.people.length === 0);
  const byId = useMemo(() => {
    const m = new Map<number, BoardPerson>();
    for (const g of generations) for (const p of g.people) m.set(p.id, p);
    return m;
  }, [generations]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-stone-700" htmlFor="branch">
          Focus line:
        </label>
        <select
          id="branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-kin focus:outline-none"
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          No {branch} visible in this layout — switch back to “All branches”.
        </p>
      ) : (
        <div className="space-y-2 overflow-x-auto pb-4">
          {filtered.map((g) => (
            <GenerationRow
              key={g.level}
              label={variant === "generations" ? PLAIN_LEVEL_LABEL(g.level) : LEVEL_LABEL(g.level)}
              people={g.people}
              unions={unions}
              byId={byId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GenerationRow({
  label,
  people,
  unions,
  byId,
}: {
  label: string;
  people: BoardPerson[];
  unions: BoardUnion[];
  byId: Map<number, BoardPerson>;
}) {
  const rowIds = new Set(people.map((p) => p.id));
  const rendered = new Set<number>();
  const items: React.ReactNode[] = [];

  for (const p of people) {
    if (rendered.has(p.id)) continue; // already shown as someone's partner
    rendered.add(p.id);
    const u = unions.find(
      (x) =>
        (x.a === p.id && x.b !== null && rowIds.has(x.b)) ||
        (x.b === p.id && rowIds.has(x.a)),
    );
    let spouse: BoardPerson | null = null;
    if (u) {
      const spouseId = u.a === p.id ? (u.b as number) : u.a;
      spouse = byId.get(spouseId) ?? null;
      if (spouse) rendered.add(spouse.id);
    }
    items.push(<PersonCard key={p.id} person={p} spouse={spouse} />);
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-parchment/60">
      <p className="px-4 pt-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </p>
      {/* One horizontal line per generation; scrolls left/right when it
          overflows instead of wrapping to a second tier. */}
      <div className="flex flex-row items-center gap-3 overflow-x-auto p-4">
        {items}
      </div>
    </div>
  );
}

function PersonCard({ person, spouse }: { person: BoardPerson; spouse: BoardPerson | null }) {
  return (
    <div className="flex items-stretch gap-2">
      <Card person={person} />
      {spouse && spouse.id !== person.id && (
        <>
          <span aria-hidden className="self-center text-stone-400">
            ⚭
          </span>
          <Card person={spouse} />
        </>
      )}
    </div>
  );
}

function Card({ person }: { person: BoardPerson }) {
  return (
    <Link
      href={`/person/${person.id}`}
      className="group block w-32 rounded-lg border border-stone-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-kin hover:shadow"
    >
      <span
        aria-hidden
        className={`mx-auto mb-2 block h-10 w-10 rounded-full ${person.sex === "f" ? "bg-rose-200" : person.sex === "m" ? "bg-sky-200" : "bg-stone-200"}`}
      />
      <span className="block text-xs font-bold leading-tight text-stone-800 group-hover:text-kin-dark">
        {person.fullName}
      </span>
      <span className="mt-1 block text-[10px] text-stone-500">{person.dates}</span>
      {person.sources !== undefined && person.sources > 0 && (
        <span className="mt-1 block text-[9px] font-semibold text-stone-400">
          {person.sources} sourced {person.sources === 1 ? "fact" : "facts"}
        </span>
      )}
      {person.living && (
        <span className="mt-1 inline-block rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-800">
          LIVING
        </span>
      )}
    </Link>
  );
}
