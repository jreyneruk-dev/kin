"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";

export interface FactItem {
  id: number;
  kind: string;
  detail: string;
  source: string | null;
  sourceUrl: string | null;
  sourceKind: string;
  confidence: string;
  createdBy: string;
}

export interface FactGroupView {
  kind: string;
  facts: FactItem[];
  conflict: boolean;
}

const KINDS = [
  "birth", "baptism", "marriage", "death", "burial",
  "residence", "emigration", "occupation", "census", "military", "note",
] as const;

const SOURCE_KIND_LABELS: Record<string, string> = {
  primary: "primary record",
  secondary: "secondary source",
  "family-lore": "family lore",
  negative: "searched — nothing found",
  unspecified: "",
};

/** Display order must match lib/facts.ts FACT_KIND_ORDER. */
const KIND_ORDER = [...KINDS];

function groupFactsView(facts: FactItem[]): FactGroupView[] {
  const byKind = new Map<string, FactItem[]>();
  for (const f of facts) {
    const arr = byKind.get(f.kind) ?? [];
    arr.push(f);
    byKind.set(f.kind, arr);
  }
  const groups: FactGroupView[] = [];
  for (const kind of KIND_ORDER) {
    const list = byKind.get(kind);
    if (!list || list.length === 0) continue;
    groups.push({ kind, facts: list, conflict: list.length > 1 });
  }
  for (const [kind, list] of byKind) {
    if ((KIND_ORDER as string[]).includes(kind)) continue;
    groups.push({ kind, facts: list, conflict: list.length > 1 });
  }
  return groups;
}

function SourceLine({ fact }: { fact: FactItem }) {
  const url = fact.sourceUrl ?? (/https?:\/\/[^\s,;)]+/i.exec(fact.source ?? "")?.[0] ?? null);
  const kindLabel = SOURCE_KIND_LABELS[fact.sourceKind] ?? "";
  const bits: string[] = [];
  if (kindLabel) bits.push(kindLabel);
  return (
    <p className="mt-1 text-xs text-stone-500">
      {bits.length > 0 && <span className="font-semibold text-stone-600">{bits.join(" · ")} · </span>}
      {fact.source &&
        (url && fact.source === url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-kin-dark underline break-all">
            {fact.source}
          </a>
        ) : (
          <>
            {fact.source}
            {url && (
              <>
                {" · "}
                <a href={url} target="_blank" rel="noreferrer" className="text-kin-dark underline break-all">
                  link
                </a>
              </>
            )}
          </>
        ))}
    </p>
  );
}

export function FactsPanel({ personId, initial }: { personId: number; initial: FactItem[] }) {
  const [facts, setFacts] = useState(initial);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("birth");
  const [detail, setDetail] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceKind, setSourceKind] = useState("primary");
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState("documented");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = groupFactsView(facts);

  return (
    <div className="mt-4">
      {facts.length === 0 && <p className="text-sm italic text-stone-500">No facts recorded yet.</p>}

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.kind}>
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-stone-500">
              {g.kind}
              {g.conflict && (
                <span title="More than one entry — the family should compare and reconcile">
                  <Badge tone="amber">conflict? {g.facts.length} entries</Badge>
                </span>
              )}
            </p>
            <ul className="mt-1 space-y-2">
              {g.facts.map((f) => (
                <li
                  key={f.id}
                  className={
                    f.sourceKind === "negative"
                      ? "rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3"
                      : "rounded-lg border border-stone-200 p-3"
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge tone={f.confidence === "documented" ? "green" : f.confidence === "likely" ? "kin" : "amber"}>
                      {f.confidence === "documented" ? "✓" : "?"} {f.kind}
                    </Badge>
                    <span className="text-sm text-stone-800">
                      {f.sourceKind === "negative" ? (
                        <>
                          Searched: <em>{f.detail}</em> — nothing found yet
                        </>
                      ) : (
                        f.detail
                      )}
                    </span>
                  </div>
                  {(f.source || f.sourceUrl) && <SourceLine fact={f} />}
                  <p className="mt-0.5 text-xs text-stone-400">added by {f.createdBy}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {open ? (
        <form
          className="mt-4 space-y-3 rounded-lg bg-stone-50 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const res = await fetch("/api/facts", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ personId, kind, detail, source, sourceUrl, sourceKind, confidence, note }),
            });
            setBusy(false);
            if (res.ok) {
              const data = (await res.json()) as { fact: FactItem };
              setFacts((prev) => [...prev, data.fact]);
              setOpen(false);
              setDetail("");
              setSource("");
              setSourceUrl("");
              setNote("");
              setSourceKind("primary");
            } else {
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              setError(data.error ?? "save failed");
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-stone-800">
              Kind
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-stone-800">
              Source type
              <select
                value={sourceKind}
                onChange={(e) => setSourceKind(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
              >
                <option value="primary">primary record (certificate, register, index)</option>
                <option value="secondary">secondary (transcript, tree, book)</option>
                <option value="family-lore">family lore</option>
                <option value="negative">searched — nothing found</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-stone-800">
            {sourceKind === "negative" ? "What did you search?" : "Detail"}
            <input
              required
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={
                sourceKind === "negative"
                  ? "e.g. GRO birth index 1896–1900, all districts"
                  : "e.g. Q1 1898, Plymouth registration district"
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-stone-800">
              Source <span className="font-normal text-stone-500">(where you saw it)</span>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={sourceKind === "negative" ? "e.g. GRO online index, searched 2026" : "e.g. GRO birth index / 1911 census RG14/…"}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="block text-sm font-semibold text-stone-800">
              Source link <span className="font-normal text-stone-500">(optional URL)</span>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-stone-800">
              Confidence
              <select
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
              >
                <option value="documented">documented (I&apos;ve seen the record)</option>
                <option value="likely">likely (strong secondary evidence)</option>
                <option value="guess">guess (needs checking)</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-stone-800">
              What changed? <span className="font-normal text-stone-500">(for the activity log)</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. ordered the certificate"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>
          {error && <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save fact"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-kin hover:text-kin-dark"
        >
          + Add a fact
        </button>
      )}
    </div>
  );
}
