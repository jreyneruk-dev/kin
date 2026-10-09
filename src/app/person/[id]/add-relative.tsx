"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Kind = "parent" | "partner" | "child";

export function AddRelativeCard({ personId }: { personId: number }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [sex, setSex] = useState("");
  const [living, setLiving] = useState(true); // Alive defaults to ticked
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: number; fullName: string } | null>(null);

  const kindLabel: Record<Kind, string> = {
    parent: "a parent",
    partner: "a partner",
    child: "a child",
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">Add a relative</h2>
      {kind === null ? (
        <div className="mt-3 grid gap-2">
          {(["parent", "partner", "child"] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-kin hover:text-kin-dark"
            >
              + Add {kindLabel[k]}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              // Abort slow requests — a hung submit used to leave the family
              // staring at "Adding…" with no way to know if it worked.
              const res = await fetch("/api/people", {
                method: "POST",
                headers: { "content-type": "application/json" },
                signal: AbortSignal.timeout(20000),
                body: JSON.stringify({
                  fullName,
                  birthDate,
                  birthPlace,
                  deathDate,
                  sex: sex || null,
                  living,
                  link: {
                    kind:
                      kind === "parent"
                        ? "parent-of"
                        : kind === "child"
                          ? "child-of"
                          : "partner-of",
                    personId,
                  },
                }),
              });
              if (res.ok) {
                const data = (await res.json()) as { id: number };
                setCreated({ id: data.id, fullName });
                setKind(null);
                setFullName("");
                setBirthDate("");
                setBirthPlace("");
                setDeathDate("");
                setSex("");
                setLiving(true); // back to the Alive default for the next add
                router.refresh();
              } else {
                const data = (await res.json().catch(() => ({}))) as { error?: string };
                setError(data.error ?? "Could not save — try again.");
              }
            } catch {
              setError(
                "The server took too long to answer. Nothing may have been saved — please check the tree before retrying.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm font-semibold text-stone-800">
            Adding {kindLabel[kind]} of this person
          </p>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              placeholder="Birth (e.g. 1898)"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={deathDate}
              onChange={(e) => {
                setDeathDate(e.target.value);
                if (e.target.value.trim()) setLiving(false);
              }}
              placeholder="Death (or blank)"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder="Birthplace (optional)"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-4 text-sm text-stone-700">
            <label className="flex items-center gap-1">
              Sex
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="rounded-lg border border-stone-300 px-2 py-1"
              >
                <option value="">—</option>
                <option value="f">female</option>
                <option value="m">male</option>
                <option value="x">other</option>
              </select>
            </label>
            <label className="flex items-center gap-1 font-semibold">
              <input
                type="checkbox"
                checked={living && !deathDate.trim()}
                disabled={Boolean(deathDate.trim())}
                onChange={(e) => setLiving(e.target.checked)}
              />
              Alive
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add to the tree"}
            </button>
            <button
              type="button"
              onClick={() => setKind(null)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
      {created && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Added {created.fullName}.{" "}
          {/* Full page load on purpose: a client-side navigate could show a
              stale cached render without the new family links. */}
          <a className="font-semibold underline" href={`/person/${created.id}`}>
            Open their profile →
          </a>
        </p>
      )}
    </div>
  );
}
