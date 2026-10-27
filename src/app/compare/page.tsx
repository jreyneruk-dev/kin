import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { allPeople } from "@/lib/db";
import { FAMILY_CLUSTER } from "@/lib/clusters";
import {
  COMPARE_PROFILE_ANCHOR,
  findHenryInTree,
  evidenceForPerson,
} from "@/lib/person-evidence";
import { Badge, Card, SectionHeading } from "@/components/ui";
import {
  allSources,
  entryIndex,
  familyLine,
  lissanoureLine,
  nextRecords,
  parishLane,
  reasons,
  timeline,
  type Evidence,
  type LineEntry,
} from "@/lib/macartney-lines";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Compare the two lines" };

const EVIDENCE_TONE: Record<Evidence, "green" | "kin" | "amber" | "stone"> = {
  documented: "green",
  pedigree: "kin",
  candidate: "amber",
  context: "stone",
};

const EVIDENCE_LABEL: Record<Evidence, string> = {
  documented: "DOCUMENTED",
  pedigree: "PEDIGREE",
  candidate: "CANDIDATE",
  context: "CONTEXT",
};

function EntryCard({ entry }: { entry: LineEntry }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-bold leading-snug text-stone-900">{entry.name}</p>
        <Badge tone={EVIDENCE_TONE[entry.evidence]}>{EVIDENCE_LABEL[entry.evidence]}</Badge>
      </div>
      <p className="mt-1 text-xs font-medium text-stone-500">{entry.dates}</p>
      <p className="text-xs text-stone-500">{entry.place}</p>
      <p className="mt-1.5 text-sm text-stone-700">{entry.role}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-kin-dark">
          What the record says
        </summary>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">{entry.note}</p>
        <ul className="mt-2 space-y-1">
          {entry.sources.map((source) => (
            <li key={source.url} className="text-[11px] leading-snug">
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
    </div>
  );
}

function Lane({
  keys,
  index,
  empty,
}: {
  keys: string[];
  index: Map<string, LineEntry>;
  empty: string;
}) {
  if (keys.length === 0) {
    return <p className="text-xs italic text-stone-400">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {keys.map((key) => {
        const entry = index.get(key);
        return entry ? <EntryCard key={key} entry={entry} /> : null;
      })}
    </div>
  );
}

export default async function ComparePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  // Evidence belongs to Henry's person record. Find that attached record for
  // the return link; both surfaces render the same typed evidence object.
  const familyPeople = await allPeople(FAMILY_CLUSTER);
  const henryPerson = findHenryInTree(familyPeople);
  const henry = henryPerson ? evidenceForPerson(henryPerson) : null;
  if (!henry) throw new Error("seeded Henry person evidence is missing");

  const index = entryIndex();
  const rows = timeline();
  const candidates = henry.candidates;
  const why = reasons();
  const next = [henry.nextRecord, ...nextRecords().filter((record) => record.record !== henry.nextRecord.record)];
  const sources = [...new Map([...allSources(), ...henry.sources].map((source) => [source.url, source])).values()];

  return (
    <div className="wrap py-10">
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">NOT LINKED · SAME SURNAME, NO RECORD</Badge>
          <span className="text-sm font-semibold text-stone-700">
            Two lines, kept apart on purpose
          </span>
        </p>
        <p className="mt-2 max-w-3xl text-sm text-stone-700">
          The documented Macartneys of Lissanoure and our Dublin Macartneys can now be read
          side by side, at the same dates, with the same evidence rules. Nothing on this page
          merges them. The empty cells are the finding: they are where the records stop.
        </p>
      </div>

      <SectionHeading
        kicker={`${lissanoureLine().length} Lissanoure people · ${familyLine().length} family rows · ${candidates.length} Henry candidates · ${why.length} reasons`}
        title="Two Macartney lines, side by side"
        lede={`${henry.verdict} The Lissanoure line is documented from a 1522 marriage to the last of the name in 1943; our line is documented from 1870 to the six Dublin children. Between them sits ${henry.name}, ${henry.role.toLowerCase()} — the one candidate, and the reason the tree cannot yet reach the Earl's era.`}
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/60">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Proven</p>
          <p className="mt-1 text-sm text-stone-700">
            Richard Henry → William Henry → the six siblings, on civil registers, a church
            baptism and the 1901/1911 census.
          </p>
        </Card>
        <Card className="border-amber-200 bg-amber-50/60">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Candidate</p>
          <p className="mt-1 text-sm text-stone-700">
            {henry.name}, {henry.role.toLowerCase()}, at {henry.candidate.townland} in Griffith&apos;s
            Valuation. The best fit in Ireland — and still only a fit.
          </p>
        </Card>
        <Card className="border-stone-300 bg-stone-50">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-600">Missing</p>
          <p className="mt-1 text-sm text-stone-700">
            Henry&apos;s parentage; Richard&apos;s baptism; and any record that names the two together.
          </p>
        </Card>
      </div>

      <section
        id={COMPARE_PROFILE_ANCHOR}
        aria-labelledby="henry-tree-heading"
        className="mb-8"
      >
        <Card className="border-amber-200 bg-amber-50/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                Henry in the tree
              </p>
              <h2 id="henry-tree-heading" className="mt-1 text-lg font-extrabold text-stone-900">
                The person this comparison turns on
              </h2>
            </div>
            <Badge tone="amber">{henry.status.toUpperCase()} · NOT PROVEN</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-stone-700">
            {henry.summary}
          </p>
          {henryPerson ? (
            <Link
              href={`/person/${henryPerson.id}`}
              className="mt-2 inline-block text-sm font-semibold text-kin-dark underline"
            >
              Open Henry Macartney&apos;s profile in the tree →
            </Link>
          ) : (
            <p className="mt-2 text-sm italic text-stone-500">
              No tree person record carries Henry&apos;s research evidence.
            </p>
          )}
        </Card>
      </section>

      <section aria-labelledby="comparison-heading">
        <h2 id="comparison-heading" className="text-lg font-extrabold tracking-tight text-stone-900">
          The comparison, by date
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Read across a row to see what each line has in the same window. The fourth column is
          deliberately not ancestry: it is other McCartney households in the candidate parish,
          printed so name-sharing cannot be mistaken for a link.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-stone-50">
          <table className="w-full min-w-[900px] border-collapse text-left align-top">
            <thead>
              <tr className="border-b border-stone-200 bg-white">
                <th scope="col" className="w-28 p-3 text-xs font-bold uppercase tracking-wide text-stone-500">
                  Date
                </th>
                <th scope="col" className="p-3 text-xs font-bold uppercase tracking-wide text-stone-500">
                  Lissanoure line
                  <span className="mt-0.5 block font-normal normal-case tracking-normal text-stone-400">
                    the Earl&apos;s documented family
                  </span>
                </th>
                <th scope="col" className="p-3 text-xs font-bold uppercase tracking-wide text-stone-500">
                  Our line
                  <span className="mt-0.5 block font-normal normal-case tracking-normal text-stone-400">
                    what a record proves about ours
                  </span>
                </th>
                <th scope="col" className="p-3 text-xs font-bold uppercase tracking-wide text-stone-500">
                  Connor / Kells households
                  <span className="mt-0.5 block font-normal normal-case tracking-normal text-stone-400">
                    same name, not ancestors
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.era}-${row.sortYear}`} className="border-b border-stone-200 last:border-0">
                  <th scope="row" className="p-3 align-top">
                    <span className="text-sm font-extrabold text-stone-800">{row.era}</span>
                  </th>
                  <td className="p-3 align-top">
                    <Lane
                      keys={row.lissanoure}
                      index={index}
                      empty="No documented generation in this window."
                    />
                  </td>
                  <td className="p-3 align-top">
                    <Lane
                      keys={row.family}
                      index={index}
                      empty="No documented family person in this window."
                    />
                  </td>
                  <td className="p-3 align-top">
                    <Lane
                      keys={row.parish}
                      index={index}
                      empty="No McCartney household found in the parish records for this window."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="henrys-heading">
        <h2 id="henrys-heading" className="text-lg font-extrabold tracking-tight text-stone-900">
          The four Henrys in Griffith&apos;s Valuation
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Henry&apos;s attached record carries all four entries; they are shown here for the side-by-side comparison.
        </p>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Griffith&apos;s Valuation (1848–64) lists every occupier of land or buildings in
          Ireland. Under every spelling it contains exactly four Henry Macartney/McCartney
          entries. Our Henry must be one of them, or none — no fifth exists in the survey.
        </p>
        {henryPerson && (
          <p className="mt-2 text-sm">
            <Link
              href={`/person/${henryPerson.id}`}
              className="font-semibold text-kin-dark underline"
            >
              See Henry&apos;s own record in the tree →
            </Link>
          </p>
        )}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {candidates.map((candidate) => (
            <Card
              key={candidate.key}
              className={candidate.fit === "best" ? "border-amber-300 ring-1 ring-amber-200" : ""}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-stone-900">{candidate.name}</p>
                <Badge tone={candidate.fit === "best" ? "amber" : "stone"}>
                  {candidate.fit === "best" ? "BEST FIT" : candidate.fit.toUpperCase()}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-medium text-stone-500">
                {candidate.record} · {candidate.county} · {candidate.parish} · {candidate.townland} ·{" "}
                {candidate.setting}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{candidate.note}</p>
              <a
                className="mt-2 inline-block text-xs font-semibold text-kin-dark underline"
                href={candidate.source.url}
                target="_blank"
                rel="noreferrer"
              >
                {candidate.source.label} →
              </a>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="reasons-heading">
        <h2 id="reasons-heading" className="text-lg font-extrabold tracking-tight text-stone-900">
          Why there is no link — the seven real reasons
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Not one of these is a dead end on its own; together they explain why the honest answer
          is a candidate, not a connection.
        </p>
        <ol className="mt-4 space-y-3">
          {why.map((reason, i) => (
            <li key={reason.title} className="rounded-xl border border-stone-200 bg-white p-4">
              <p className="text-sm font-bold text-stone-900">
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-kin-light text-[11px] font-extrabold text-kin-dark">
                  {i + 1}
                </span>
                {reason.title}
              </p>
              <p className="mt-1.5 pl-7 text-sm leading-relaxed text-stone-600">{reason.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-lg font-extrabold tracking-tight text-stone-900">
          What would actually settle it
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          The specific baptism entry on Henry&apos;s person record comes first: it is the one
          document that could resolve his parentage and test the proposed Cromkill location.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {next.map((item) => (
            <Card key={item.record}>
              <p className="text-sm font-bold text-stone-900">{item.record}</p>
              <p className="mt-1 text-sm text-stone-600">{item.gives}</p>
              <p className="mt-2 text-xs font-medium text-stone-500">{item.where}</p>
              {item.url && (
                <a
                  className="mt-1 inline-block text-xs font-semibold text-kin-dark underline"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Where to look →
                </a>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="text-lg font-extrabold tracking-tight text-stone-900">
          Every source behind this page
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          {sources.length} distinct sources, including the URLs carried directly on Henry&apos;s
          person record. Printed pedigrees, official indexes, census transcriptions and the
          family&apos;s research memos — no claim is left unattributed.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {sources.map((source) => (
            <li key={source.url} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <a
                className="font-semibold text-kin-dark underline"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/lissanoure" className="text-kin-dark underline">
          ← The Lissanoure research line
        </Link>
        <Link href="/research" className="text-kin-dark underline">
          The research hub →
        </Link>
      </div>
    </div>
  );
}
