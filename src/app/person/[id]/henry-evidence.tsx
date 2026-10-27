import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { PersonResearchEvidence } from "@/lib/types";

/**
 * The sourced research file on Henry's own profile. Server component: every
 * value is loaded from the person's stored `researchEvidence` field.
 */
export function HenryEvidencePanel({ evidence }: { evidence: PersonResearchEvidence }) {
  const best = evidence.candidate;

  return (
    <Card className="border-amber-300 bg-amber-50/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Research evidence attached to this record
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-stone-900">
            Candidate — not a proven ancestor
          </h2>
        </div>
        <Badge tone="amber">{evidence.status.toUpperCase()}</Badge>
      </div>

      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-700">
        This is the same sourced record set behind{" "}
        <Link href={evidence.compareHref} className="font-semibold text-kin-dark underline">
          the two-line comparison
        </Link>
        . It is attached as evidence only. <strong>No parent is recorded, and the tree adds
        none.</strong> No proven birth year, marriage or death survives for him either.
      </p>

      {/* The canonical summary from the comparison data, printed on the record
          itself so this profile and /compare cannot drift apart. */}
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">
        {evidence.summary}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">The person</p>
          <p className="mt-1 text-sm font-bold text-stone-900">{evidence.name}</p>
          <p className="text-xs font-medium text-stone-500">{evidence.dates}</p>
          <p className="text-xs text-stone-500">{evidence.role}</p>
          <p className="mt-1 text-xs text-stone-600">{evidence.place}</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
            Griffith&apos;s Valuation, 1861
          </p>
          <p className="mt-1 text-sm font-bold text-stone-900">
            {best.name} — {best.townland}, {best.parish}, Co. {best.county}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">{best.note}</p>
          <a
            className="mt-1 inline-block text-[11px] font-semibold text-kin-dark underline"
            href={best.source.url}
            target="_blank"
            rel="noreferrer"
          >
            Griffith&apos;s index →
          </a>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
            The gap in the candidate parish
          </p>
          <p className="mt-1 text-sm font-bold text-stone-900">
            {evidence.titheGap.dates} tithe book — no Henry
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">{evidence.titheGap.note}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
            Earlier context — not ancestry
          </p>
          <p className="mt-1 text-sm font-bold text-stone-900">
            {evidence.hearthContext.name}, {evidence.hearthContext.dates}
          </p>
          <p className="text-xs text-stone-500">{evidence.hearthContext.place}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-600">
            {evidence.hearthContext.note}
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
            All four Henrys in Griffith&apos;s
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Exactly four entries exist in Ireland. Ours must be one of them, or none.
          </p>
          <ul className="mt-2 space-y-1">
            {evidence.candidates.map((candidate) => (
              <li key={candidate.key} className="text-xs text-stone-700">
                <span className="font-semibold">{candidate.name}</span> — {candidate.townland},{" "}
                {candidate.parish}, Co. {candidate.county}{" "}
                <span className="uppercase text-stone-500">({candidate.fit})</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-stone-100 pt-2 text-[11px] leading-snug text-stone-600">
            The 1861 Cromkill cluster: {evidence.cromkillHouseholds.name} —{" "}
            {evidence.cromkillHouseholds.role.toLowerCase()}.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-kin/30 bg-white p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-kin-dark">
          What would break the wall
        </p>
        <p className="mt-1 text-sm font-bold text-stone-900">{evidence.nextRecord.record}</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">{evidence.nextRecord.gives}</p>
        <p className="mt-1 text-xs font-medium text-stone-500">{evidence.nextRecord.where}</p>
        {evidence.nextRecord.url && (
          <a
            className="mt-1 inline-block text-[11px] font-semibold text-kin-dark underline"
            href={evidence.nextRecord.url}
            target="_blank"
            rel="noreferrer"
          >
            Where to look →
          </a>
        )}
      </div>

      <details className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-kin-dark">
          Sources on this record ({evidence.sources.length})
        </summary>
        <ul className="mt-2 space-y-1">
          {evidence.sources.map((source) => (
            <li key={source.url} className="text-xs leading-snug">
              <a
                className="text-kin-dark underline decoration-stone-300 underline-offset-2"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </details>

      <p className="mt-3 text-xs font-semibold text-stone-500">
        The record behind this panel is a candidate, not a kinship claim. The empty parent slot
        above is the finding, not a gap to fill by guesswork.
      </p>
    </Card>
  );
}
