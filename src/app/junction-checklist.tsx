"use client";

import { useState } from "react";
import type { ChecklistItem, ChecklistStatus } from "@/lib/types";
import {
  CHECKLIST_STATUSES,
  CHECKLIST_STATUS_LABEL,
  groupChecklist,
  isRead,
} from "@/lib/checklist";
import { Badge } from "@/components/ui";

const TONES: Record<ChecklistStatus, "stone" | "amber" | "green" | "kin" | "rose"> = {
  todo: "stone",
  doing: "amber",
  found: "green",
  negative: "kin",
  blocked: "rose",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** UTC parts keep server-rendered and hydrated text identical. */
function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type Draft = { status: ChecklistStatus; note: string };

/**
 * The junction checklist, working: each row carries its status and the note
 * recording what a human read found, saved one row at a time. Client
 * component so a save lands in place; the hub stays server-rendered and hands
 * the rows in as props.
 */
export function JunctionChecklist({ items }: { items: ChecklistItem[] }) {
  const [rows, setRows] = useState(items);
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    const out: Record<number, Draft> = {};
    for (const item of items) out[item.id] = { status: item.status, note: item.note };
    return out;
  });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Record<number, string>>({});

  if (rows.length === 0) return null;

  const isDirty = (item: ChecklistItem): boolean => {
    const draft = drafts[item.id];
    return draft.status !== item.status || draft.note.trim() !== item.note;
  };

  async function save(item: ChecklistItem) {
    setBusyId(item.id);
    const res = await fetch(`/api/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(drafts[item.id]),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMessages((m) => ({ ...m, [item.id]: data.error ?? "could not save" }));
      return;
    }
    const data = (await res.json()) as { item: ChecklistItem };
    setRows((prev) => prev.map((r) => (r.id === item.id ? data.item : r)));
    setDrafts((d) => ({ ...d, [item.id]: { status: data.item.status, note: data.item.note } }));
    setMessages((m) => ({ ...m, [item.id]: "Saved." }));
    setTimeout(
      () =>
        setMessages((m) => {
          const next = { ...m };
          delete next[item.id];
          return next;
        }),
      4000,
    );
  }

  return (
    <div className="space-y-8">
      {groupChecklist(rows).map((group) => {
        const read = group.items.filter(isRead).length;
        return (
          <div key={group.section}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-base font-extrabold tracking-tight text-stone-900">
                {group.section}
              </h3>
              <span className="text-xs font-semibold text-stone-500">
                {read} of {group.items.length} read
              </span>
            </div>
            <ul className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
              {group.items.map((item) => {
                const draft = drafts[item.id];
                return (
                  <li key={item.id} className="p-4">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-900">
                      <Badge tone={TONES[item.status]}>{CHECKLIST_STATUS_LABEL[item.status]}</Badge>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-kin-dark underline"
                        >
                          {item.title}
                        </a>
                      ) : (
                        <span>{item.title}</span>
                      )}
                    </p>
                    <p className="mt-1 max-w-3xl text-sm text-stone-600">{item.detail}</p>
                    {item.updatedBy && item.updatedAt !== null && (
                      <p className="mt-1 text-xs text-stone-400">
                        last worked on by {item.updatedBy} · {shortDate(item.updatedAt)}
                      </p>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
                      <label className="block text-xs font-bold text-stone-500">
                        Status
                        <select
                          value={draft.status}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [item.id]: { ...d[item.id], status: e.target.value as ChecklistStatus },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal text-stone-800"
                        >
                          {CHECKLIST_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {CHECKLIST_STATUS_LABEL[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-bold text-stone-500">
                        What the reading found
                        <textarea
                          rows={2}
                          value={draft.note}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [item.id]: { ...d[item.id], note: e.target.value },
                            }))
                          }
                          placeholder="e.g. occupation: farmer — place: Ballylesson, Co. Down"
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal"
                        />
                      </label>
                      <button
                        onClick={() => save(item)}
                        disabled={busyId === item.id || !isDirty(item)}
                        className="rounded-lg bg-kin px-3 py-1.5 text-xs font-bold text-white hover:bg-kin-dark disabled:opacity-50"
                      >
                        {busyId === item.id ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {messages[item.id] && (
                      <p className="mt-1 text-xs text-kin-dark">{messages[item.id]}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
