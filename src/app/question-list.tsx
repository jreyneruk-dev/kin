"use client";

import Link from "next/link";
import { useState } from "react";
import type { Question } from "@/lib/types";

export function QuestionList({ questions }: { questions: Question[] }) {
  const [items, setItems] = useState(questions);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function toggle(id: number, status: Question["status"]) {
    setBusyId(id);
    const res = await fetch("/api/questions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action: status === "open" ? "answer" : "reopen" }),
    });
    setBusyId(null);
    if (res.ok) {
      setItems((prev) =>
        prev.map((q) =>
          q.id === id
            ? { ...q, status: status === "open" ? "answered" : "open" }
            : q,
        ),
      );
    }
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-lg font-extrabold tracking-tight text-stone-900">Research questions</h2>
      <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {items.map((q) => (
          <li key={q.id} className="flex items-start justify-between gap-4 p-4">
            <div>
              <p className={`text-sm font-semibold ${q.status === "answered" ? "text-stone-400 line-through" : "text-stone-900"}`}>
                {q.title}
              </p>
              {q.detail && <p className="mt-1 max-w-3xl text-sm text-stone-600">{q.detail}</p>}
              {q.personId && (
                <Link href={`/person/${q.personId}`} className="mt-1 inline-block text-xs font-semibold text-kin-dark underline">
                  Open profile →
                </Link>
              )}
              <p className="mt-1 text-xs text-stone-400">raised by {q.raisedBy}</p>
            </div>
            <button
              onClick={() => toggle(q.id, q.status)}
              disabled={busyId === q.id}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
                q.status === "open"
                  ? "bg-kin text-white hover:bg-kin-dark"
                  : "border border-stone-300 text-stone-600 hover:border-kin"
              }`}
            >
              {q.status === "open" ? "Mark answered" : "Reopen"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
