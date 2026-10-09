"use client";

import { useState } from "react";
import type { SourceKind } from "@/lib/types";

/**
 * "I found something" — files a sourced fact against the question's person and
 * optionally closes the question, in one submit. Shared by the research hub
 * and the person-page question section (same endpoint, same UX).
 */
export function FindingsForm({
  questionId,
  onClose, // optional callback in the host page after a successful close
  compact = false,
}: {
  questionId: number;
  onClose?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("primary");
  const [close, setClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-kin-dark underline"
      >
        + I found something
      </button>
    );
  }

  return (
    <form
      className={`mt-2 space-y-2 rounded-lg bg-stone-50 p-3 ${compact ? "text-sm" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch(`/api/questions/${questionId}/finding`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            detail,
            source: sourceName,
            sourceUrl,
            sourceKind,
            close,
          }),
        });
        setBusy(false);
        if (res.ok) {
          setOpen(false);
          setMsg("Filed — refresh to see it on the profile.");
          onClose?.();
          setTimeout(() => setMsg(null), 4000);
          window.location.reload();
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setMsg(data.error ?? "could not save");
        }
      }}
    >
      <label className="block font-semibold text-stone-800">
        What did you find?
        <textarea
          required
          rows={2}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="e.g. GRO index: Macartney × Grainger, Q2 1896, Edmonton district"
          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block font-semibold text-stone-800">
          Source
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. GRO online index"
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal"
          />
        </label>
        <label className="block font-semibold text-stone-800">
          Source link
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block font-semibold text-stone-800">
          Source type
          <select
            value={sourceKind}
            onChange={(e) => setSourceKind(e.target.value as SourceKind)}
            className="mt-1 block w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm font-normal sm:w-auto"
          >
            <option value="primary">primary record</option>
            <option value="secondary">secondary</option>
            <option value="family-lore">family lore</option>
            <option value="negative">searched — nothing found</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} />
          Close the question
        </label>
      </div>
      {msg && <p className="text-xs text-kin-dark">{msg}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !detail.trim()}
          className="rounded-lg bg-kin px-3 py-1.5 text-xs font-bold text-white hover:bg-kin-dark disabled:opacity-50"
        >
          {busy ? "Filing…" : "File finding"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
