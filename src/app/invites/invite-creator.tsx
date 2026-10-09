"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteCreator() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await fetch("/api/invites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ note }),
          });
          setBusy(false);
          if (res.ok) {
            const data = (await res.json()) as { code: string };
            setCode(data.code);
            setNote("");
            router.refresh();
          }
        }}
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Who is it for? (e.g. michael)"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </form>
      {code && (
        <p className="mt-3 rounded-lg bg-kin-light px-3 py-2 text-sm text-kin-dark">
          New code:{" "}
          <a className="font-mono font-bold underline" href={`/join?code=${code}`}>
            {code}
          </a>{" "}
          — send them the link /join?code={code}
        </p>
      )}
    </div>
  );
}
