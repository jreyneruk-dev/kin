"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";

export interface Row {
  id: number;
  fullName: string;
  aliases: string[];
  dates: string;
  sex: string | null;
  living: boolean;
  branch: string;
  sourcedFacts: number;
  totalFacts: number;
  missing: { birth: boolean; death: boolean; place: boolean };
}

export function PeopleSearch({ rows, branches }: { rows: Row[]; branches: string[] }) {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [gapsOnly, setGapsOnly] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (branch !== "all" && r.branch !== branch) return false;
        if (gapsOnly && !(r.missing.birth || r.missing.death || r.missing.place)) return false;
        if (q) {
          const needle = q.toLowerCase();
          const inName = r.fullName.toLowerCase().includes(needle);
          const inAlias = r.aliases.some((a) => a.toLowerCase().includes(needle));
          if (!inName && !inAlias) return false;
        }
        return true;
      }),
    [rows, q, branch, gapsOnly],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names and spelling variants…"
          className="w-56 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-kin focus:outline-none"
        />
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
          <input type="checkbox" checked={gapsOnly} onChange={(e) => setGapsOnly(e.target.checked)} />
          Only people with missing details
        </label>
      </div>

      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {filtered.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link href={`/person/${r.id}`} className="font-bold text-stone-900 hover:text-kin-dark">
                {r.fullName}
              </Link>
              <p className="text-sm text-stone-500">
                {r.dates} · {r.branch}
                {r.aliases.length > 0 && <span className="italic"> · also: {r.aliases.join(", ")}</span>}
                {r.living && (
                  <span className="ml-2">
                    <Badge tone="green">LIVING</Badge>
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.totalFacts === 0 ? (
                <Badge tone="amber">no facts yet</Badge>
              ) : r.sourcedFacts === 0 ? (
                <Badge tone="amber">0 sourced</Badge>
              ) : (
                <Badge tone="green">
                  {r.sourcedFacts}/{r.totalFacts} sourced
                </Badge>
              )}
              {r.missing.birth && <Badge tone="amber">birth?</Badge>}
              {r.missing.death && <Badge tone="amber">death?</Badge>}
              {r.missing.place && <Badge tone="amber">place?</Badge>}
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="p-6 text-center text-sm text-stone-500">No matches.</li>
        )}
      </ul>
    </div>
  );
}
