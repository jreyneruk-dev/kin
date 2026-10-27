/**
 * The research tab: the documented Macartneys of Lissanoure, on their own.
 *
 * Every read on this page is scoped to the 'lissanoure' cluster, so the family
 * tree's people, couples and facts are never even loaded here — this board
 * cannot show a family-tree person among its relatives, exactly as the family
 * tree cannot show one of these (see src/lib/clusters.ts and
 * test/cluster.test.ts). It is the cluster's only entry point: nothing in the
 * family surfaces links to it.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { allFacts, allPeople, allUnions, childLinks } from "@/lib/db";
import { LISSANOURE_CLUSTER } from "@/lib/clusters";
import { buildGraph, generationsOf, surnameOf } from "@/lib/tree";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { TreeBoard } from "../tree-board";

export const dynamic = "force-dynamic";

/** Shown when the database guard gives up — see the catch in LissanourePage. */
function BusyCard() {
  return (
    <div className="wrap max-w-2xl py-16">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
          The database didn’t answer in time
        </h1>
        <p className="mt-2 text-sm text-stone-700">
          kin gives up after eight seconds rather than hang, and loading several pages at once can push a
          request over that line. Nothing is lost — this research line is still exactly as it was.
        </p>
        <p className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link className="text-kin-dark underline" href="/lissanoure">
            Try again
          </Link>
          <Link className="text-kin-dark underline" href="/">
            Back to the tree
          </Link>
        </p>
      </div>
    </div>
  );
}

export default async function LissanourePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  let loaded: [Awaited<ReturnType<typeof allPeople>>, Awaited<ReturnType<typeof allUnions>>, Awaited<ReturnType<typeof childLinks>>, Awaited<ReturnType<typeof allFacts>>];
  try {
    loaded = await Promise.all([
      allPeople(LISSANOURE_CLUSTER),
      allUnions(LISSANOURE_CLUSTER),
      childLinks(LISSANOURE_CLUSTER),
      allFacts(LISSANOURE_CLUSTER),
    ]);
  } catch (error) {
    // Playtest finding: a burst of reloads can push a request past the 8s
    // database guard (src/lib/db.ts), which surfaced as a bare error page. The
    // tab owns a plain sentence and a retry instead.
    if (String(error).includes("kin db timeout")) return <BusyCard />;
    throw error;
  }
  const [people, unions, links, facts] = loaded;

  const graph = buildGraph({ people, unions, childLinks: links });

  // Anchor on the top of the line: whoever has no parents in this cluster,
  // earliest first. (The family tree anchors on William H by hand; here the
  // data decides, so a new earliest generation appears without a code change.)
  const childIds = new Set(links.map((l) => l.personId));
  const rootId =
    people
      .filter((p) => !childIds.has(p.id))
      .sort((a, b) => (a.birthDate ?? "9999").localeCompare(b.birthDate ?? "9999"))
      .at(0)?.id ?? people[0]?.id;

  const generations = rootId === undefined ? [] : generationsOf(graph, rootId);
  const branches = [...new Set(people.map((p) => surnameOf(p.fullName)))].sort();

  const sourcedByPerson = new Map<number, number>();
  for (const f of facts) {
    if (f.source) sourcedByPerson.set(f.personId, (sourcedByPerson.get(f.personId) ?? 0) + 1);
  }
  const sourcedFacts = facts.filter((f) => f.source).length;

  // One row per distinct source the line rests on, with how much of the
  // pedigree leans on it — the tab's claim is that every fact is attributable.
  const sourceTally = new Map<string, { source: string; url: string | null; count: number }>();
  for (const f of facts) {
    if (!f.source) continue;
    const key = `${f.source}|${f.sourceUrl ?? ""}`;
    const row = sourceTally.get(key) ?? { source: f.source, url: f.sourceUrl, count: 0 };
    row.count += 1;
    sourceTally.set(key, row);
  }
  const sourceRows = [...sourceTally.values()].sort((a, b) => a.source.localeCompare(b.source));

  return (
    <div className="wrap py-10">
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">RESEARCH LINE · {LISSANOURE_CLUSTER.toUpperCase()}</Badge>
          <span className="text-sm font-semibold text-stone-700">Not connected to the family tree</span>
        </p>
        <p className="mt-2 max-w-3xl text-sm text-stone-700">
          A documented Antrim family kept beside ours, never inside it. These {people.length} people and
          their {sourcedFacts} sourced facts sit in their own cluster: the tree, the people list and the
          GEDCOM export cannot show one of them, and this board cannot show a family-tree person among the
          relatives. Combining the two is a deliberate step, taken only if a record ever connects them.
        </p>
        {user.role === "owner" && (
          <p className="mt-2 text-xs text-stone-600">
            Owner:{" "}
            <Link className="underline" href="/api/export?cluster=lissanoure">
              export this line alone as GEDCOM
            </Link>{" "}
            — the plain export stays the family tree.
          </p>
        )}
        <p className="mt-3 text-sm">
          <Link className="font-semibold text-kin-dark underline" href="/compare">
            Compare the two lines side by side →
          </Link>{" "}
          <span className="text-stone-700">
            every documented generation, the four Henry candidates, and the reasons no record
            joins them.
          </span>
        </p>
      </div>

      <SectionHeading
        kicker={`${people.length} people · ${unions.length} couples · ${sourcedFacts} sourced facts`}
        title="The Macartneys of Lissanoure, Co. Antrim"
        lede="George Macartney left Auchinleck for Belfast in 1649 and bought Lissanoure in 1733; the line runs to George Travers Lucy Macartney, the last of the name, in 1943. The 1st Earl Macartney (d. 1806) died without issue, so the estate and the name continued through his sister's line — which means any kinship claim today is about a cadet branch or a deeper shared ancestor, not descent from the Earl."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <TreeBoard
            variant="generations"
            generations={generations.map((g) => ({
              level: g.level,
              people: g.people.map((p) => ({
                id: p.id,
                fullName: p.fullName,
                dates:
                  p.birthDate || p.deathDate
                    ? `${p.birthDate ?? "?"} – ${p.living ? "living" : (p.deathDate ?? "?")}`
                    : "dates unknown",
                sex: p.sex,
                living: p.living,
                sources: sourcedByPerson.get(p.id) ?? 0,
              })),
            }))}
            unions={unions.map((u) => ({ id: u.id, a: u.partnerA, b: u.partnerB }))}
            branches={branches}
          />
          <p className="mt-3 text-sm text-stone-600">
            Open anyone to read their facts and the source for each one — every claim in this line carries
            where it came from, and what is missing is recorded as missing.
          </p>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">
              What would settle it
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-stone-700">
              <li>
                <strong>Pin our side to a place.</strong> The 1870 St Mark&apos;s marriage was by licence,
                so a Dublin diocesan bond should name the groom&apos;s parish; a Macartney baptism sweep in
                the church registers would place Henry Macartney&apos;s farm.
              </li>
              <li>
                <strong>Compare against this line&apos;s places.</strong> Loughguile/Dervock, and the
                Lissanoure estate papers. A tenant named Macartney on a Macartney estate proves nothing —
                name-sharing is the trap here.
              </li>
              <li>
                <strong>Y-DNA, only if a tester exists.</strong> A living male-line Macartney of ours
                against a documented Macartney of the Galloway/Ulster line: a mismatch is a clean disproof,
                a match dates nothing.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">
              Sources behind this line
            </h2>
            <ul className="mt-3 space-y-3 text-sm">
              {sourceRows.map((row) => (
                <li key={`${row.source}`} className="text-stone-700">
                  {row.url ? (
                    <a
                      className="font-semibold text-kin-dark underline"
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.source}
                    </a>
                  ) : (
                    <span className="font-semibold">{row.source}</span>
                  )}
                  <span className="text-xs text-stone-500"> · {row.count} facts</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Transcriptions of printed pedigrees and local history: secondary sources, recorded as such on
              every fact.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
