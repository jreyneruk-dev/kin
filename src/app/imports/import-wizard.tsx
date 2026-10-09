"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui";

interface PlanEntry {
  xref: string;
  name: string;
  action: "skip" | "merge" | "create";
  mergeInto: number | null;
  mergeName: string | null;
  score: number;
  birthYear: number | null;
}

interface Plan {
  charset: string;
  sourceApp: string | null;
  parseNotes: string[];
  people: PlanEntry[];
  families: { xref: string; husband: string | null; wife: string | null; children: number; marriageDate: string | null; marriagePlace: string | null }[];
  totals: { in: number; merge: number; create: number; skip: number };
}

type Phase = "idle" | "previewing" | "review" | "committing" | "done" | "error";

const ACTION_LABEL: Record<PlanEntry["action"], string> = {
  merge: "Merge into existing",
  create: "Add as new person",
  skip: "Skip this one",
};

export function ImportWizard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [actions, setActions] = useState<Record<string, PlanEntry["action"]>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const gedRef = useRef<string>("");

  async function preview(file: File) {
    setPhase("previewing");
    setError(null);
    setResult(null);
    const text = await file.text();
    gedRef.current = text;
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gedcom: text }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "could not read that file");
      setPhase("error");
      return;
    }
    const data = (await res.json()) as { plan: Plan };
    setPlan(data.plan);
    const initial: Record<string, PlanEntry["action"]> = {};
    for (const p of data.plan.people) initial[p.xref] = p.action;
    setActions(initial);
    setPhase("review");
  }

  async function commit() {
    if (!plan) return;
    setPhase("committing");
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gedcom: gedRef.current,
        confirm: true,
        actions: plan.people.map((p) => ({ xref: p.xref, action: actions[p.xref] ?? p.action })),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "import failed");
      setPhase("error");
      return;
    }
    const data = (await res.json()) as { counts: { created: number; merged: number; skipped: number } };
    setResult(`Done — ${data.counts.created} people added, ${data.counts.merged} merged into existing records, ${data.counts.skipped} skipped.`);
    setPhase("done");
  }

  const busy = phase === "previewing" || phase === "committing";
  const chosen = (p: PlanEntry) => actions[p.xref] ?? p.action;
  const pendingTotals = plan
    ? plan.people.reduce(
        (acc, p) => {
          acc[chosen(p)] += 1;
          return acc;
        },
        { create: 0, merge: 0, skip: 0 } as Record<PlanEntry["action"], number>,
      )
    : null;

  return (
    <div className="mt-6 space-y-6">
      {/* Export */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-extrabold text-stone-900">Backup the whole tree</h2>
        <p className="mt-1 text-sm text-stone-600">
          Downloads every person, family, fact and source as a standard GEDCOM file that any
          genealogy program (Ancestry, Gramps, FamilySearch via tools) can open.
        </p>
        <a
          href="/api/export"
          className="mt-3 inline-block rounded-lg border border-kin px-4 py-2 text-sm font-bold text-kin-dark hover:bg-kin-light"
        >
          ↓ Download GEDCOM backup
        </a>
      </div>

      {/* Import */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-extrabold text-stone-900">Import a GEDCOM file</h2>
        <p className="mt-1 text-sm text-stone-600">
          Nothing is written until you review the plan: kin shows every person it found and
          whether it looks like someone already in the tree.
        </p>

        <input
          type="file"
          accept=".ged,.gedcom,text/plain"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void preview(f);
          }}
          className="mt-3 block w-full text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-kin file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-kin-dark"
        />

        {phase === "previewing" && <p className="mt-3 text-sm text-stone-500">Reading the file…</p>}
        {error && <p className="mt-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        {result && <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{result}</p>}

        {plan && (phase === "review" || phase === "done") && (
          <div className="mt-4">
            <p className="text-sm text-stone-700">
              Found <strong>{plan.totals.in}</strong> named people and <strong>{plan.families.length}</strong> families
              {plan.sourceApp ? (
                <>
                  {" "}from <span className="italic">{plan.sourceApp}</span>
                </>
              ) : null}
              {plan.totals.skip > 0 ? <> · {plan.totals.skip} unnamed record(s) will be skipped</> : null}.
            </p>
            {plan.parseNotes.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-700">
                {plan.parseNotes.map((n, i) => (
                  <li key={i}>⚠ {n}</li>
                ))}
              </ul>
            )}

            {pendingTotals && phase === "review" && (
              <p className="mt-3 text-sm font-semibold text-stone-800">
                Plan: {pendingTotals.merge} merged · {pendingTotals.create} added · {pendingTotals.skip} skipped
              </p>
            )}

            <ul className="mt-3 divide-y divide-stone-200 rounded-lg border border-stone-200">
              {plan.people.map((p) => (
                <li key={p.xref} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-bold text-stone-900">{p.name}</p>
                    <p className="text-xs text-stone-500">
                      {p.birthYear ? `b. ${p.birthYear}` : "no birth year"}
                      {p.action === "merge" && p.mergeName ? (
                        <>
                          {" "}· looks like <span className="font-semibold text-kin-dark">{p.mergeName}</span> ({Math.round(p.score * 100)}% match)
                        </>
                      ) : null}
                    </p>
                  </div>
                  <select
                    aria-label={`Action for ${p.name}`}
                    value={chosen(p)}
                    disabled={phase === "done"}
                    onChange={(e) =>
                      setActions((prev) => ({ ...prev, [p.xref]: e.target.value as PlanEntry["action"] }))
                    }
                    className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  >
                    {(Object.keys(ACTION_LABEL) as PlanEntry["action"][]).map((a) => (
                      <option key={a} value={a}>
                        {ACTION_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            {phase === "review" && (
              <button
                onClick={() => void commit()}
                disabled={busy}
                className="mt-4 rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
              >
                {busy ? "Importing…" : "Import according to this plan"}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-stone-500">
        <Badge tone="kin">Tip</Badge> Import is additive: merges fill blanks and add aliases, they
        never overwrite what&apos;s already recorded. Run a backup first if you&apos;re unsure.
      </p>
    </div>
  );
}
