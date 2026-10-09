"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommentForm({ personId }: { personId: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ personId, body }),
        });
        setBusy(false);
        if (res.ok) {
          setBody("");
          router.refresh();
        }
      }}
    >
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment for the family…"
        className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-kin focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !body.trim()}
        className="rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
      >
        Comment
      </button>
    </form>
  );
}
