"use client";

/**
 * What a visitor sees when a page render fails.
 *
 * The observed failure mode is the database guard giving up: src/lib/db.ts caps
 * any single query at 8s (Supavisor can wedge, and a hang is worse than an
 * error), which trips when several pages are loaded at once through the one
 * pooled connection — a handful of rapid reloads is enough. Without this
 * boundary the family got Next's bare "Application error" screen and no way
 * out; with it they get a sentence, a retry, and a route back to the tree.
 */

import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const timedOut = error.message.includes("kin db timeout");
  return (
    <div className="wrap max-w-2xl py-16">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
          {timedOut ? "The database didn’t answer in time" : "Something went wrong on this page"}
        </h1>
        <p className="mt-2 text-sm text-stone-700">
          {timedOut
            ? "kin talks to a small database in Sydney and gives up after eight seconds rather than hang. Loading several pages at once can push a request over that line — nothing is lost, and trying again usually works."
            : "Nothing is lost — the page just didn’t finish. Trying again usually works."}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:border-kin hover:text-kin-dark"
          >
            Try again
          </button>
          <Link href="/" className="text-sm font-semibold text-kin-dark underline">
            Back to the tree
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-xs text-stone-500">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
