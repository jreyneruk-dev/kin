"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/auth/join", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code, name, email, password }),
        });
        setBusy(false);
        if (res.ok) {
          router.push("/");
          router.refresh();
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "couldn't join");
        }
      }}
    >
      <label className="block text-sm font-semibold text-stone-800">
        Invite code
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm font-normal focus:border-kin focus:outline-none"
          placeholder="e.g. k3m2pa9x"
        />
      </label>
      <label className="block text-sm font-semibold text-stone-800">
        Your name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:border-kin focus:outline-none"
          placeholder="How comments will be signed"
        />
      </label>
      <label className="block text-sm font-semibold text-stone-800">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:border-kin focus:outline-none"
        />
      </label>
      <label className="block text-sm font-semibold text-stone-800">
        Password <span className="font-normal text-stone-500">(8+ characters)</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal focus:border-kin focus:outline-none"
        />
      </label>
      {error && <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join the tree"}
      </button>
    </form>
  );
}
