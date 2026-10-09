"use client";

import { useState } from "react";
import type { ResearchTarget } from "@/lib/research-links";

/** Collapsible deep-link pack. Links open in a new tab; kin never fetches them. */
export function SearchPack({ targets, defaultOpen = false }: { targets: ResearchTarget[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-bold text-kin-dark underline"
      >
        {open ? "▾ Hide search pack" : `▸ Search pack (${targets.length} links)`}
      </button>
      {open && (
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {targets.map((t) => (
            <li key={t.url} className="truncate">
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                title={t.note}
                className="text-xs text-stone-700 hover:text-kin-dark hover:underline"
              >
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
