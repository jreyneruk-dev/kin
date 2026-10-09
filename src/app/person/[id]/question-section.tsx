"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Question } from "@/lib/types";
import { researchPack } from "@/lib/research-links";
import { SearchPack } from "../../search-pack";
import { FindingsForm } from "../../findings-form";

export function QuestionSection({
  personId,
  initial,
  personName,
  aliases,
}: {
  personId: number;
  initial: Question[];
  personName: string;
  aliases: string[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle(q: Question) {
    const res = await fetch("/api/questions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: q.id, action: q.status === "open" ? "answer" : "reopen" }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === q.id ? { ...x, status: q.status === "open" ? "answered" : "open" } : x,
        ),
      );
      router.refresh();
    }
  }

  return (
    <div>
      <p className="mt-1 text-sm text-stone-600">
        What would you like someone to find out? Questions appear on the Research page too.
      </p>

      <ul className="mt-4 space-y-2">
        {items.length === 0 && <li className="text-sm italic text-stone-500">No questions yet.</li>}
        {items.map((q) => (
          <li key={q.id} className="rounded-lg border border-stone-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${q.status === "answered" ? "text-stone-400 line-through" : "text-stone-900"}`}>
                  {q.title}
                </p>
                {q.detail && <p className="mt-1 text-sm text-stone-600">{q.detail}</p>}
                <p className="mt-1 text-xs text-stone-400">raised by {q.raisedBy}</p>
              </div>
              <button
                onClick={() => toggle(q)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  q.status === "open"
                    ? "bg-kin text-white hover:bg-kin-dark"
                    : "border border-stone-300 text-stone-600 hover:border-kin"
                }`}
              >
                {q.status === "open" ? "Answered" : "Reopen"}
              </button>
            </div>
            {q.status === "open" && (
              <>
                <SearchPack
                  targets={researchPack(
                    personName,
                    aliases,
                    /\b(1[89]\d{2}|20\d{2})\b/.exec(q.detail ?? q.title)?.[1]
                      ? Number(/\b(1[89]\d{2}|20\d{2})\b/.exec(q.detail ?? q.title)![1])
                      : null,
                  )}
                />
                <FindingsForm questionId={q.id} />
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          setBusy(true);
          const res = await fetch("/api/questions", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ personId, title, detail }),
          });
          setBusy(false);
          if (res.ok) {
            setTitle("");
            setDetail("");
            router.refresh();
          }
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-kin focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg border border-kin px-4 py-2 text-sm font-bold text-kin-dark hover:bg-kin-light disabled:opacity-50"
        >
          Ask
        </button>
      </form>
      {detail !== "" || title !== "" ? (
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Optional: what you know already, and where you've looked…"
          rows={2}
          className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-kin focus:outline-none"
        />
      ) : null}
    </div>
  );
}
