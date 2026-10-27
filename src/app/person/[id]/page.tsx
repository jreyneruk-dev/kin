import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import {
  allPeople,
  allUnions,
  childLinks,
  commentsForPerson,
  commentsForUnion,
  factsFor,
  getPerson,
  imagesFor,
  questionsForPerson,
} from "@/lib/db";
import { Badge, Card, lifespan, PersonChip } from "@/components/ui";
import { isFamilyCluster } from "@/lib/clusters";
import { evidenceForPerson } from "@/lib/person-evidence";
import type { Person } from "@/lib/types";
import { FactsPanel } from "./facts-panel";
import { HenryEvidencePanel } from "./henry-evidence";
import { CommentForm } from "./comment-form";
import { ImagesPanel } from "./images-panel";
import { QuestionSection } from "./question-section";
import { AddRelativeCard } from "./add-relative";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const person = await getPerson(id);
  if (!person) notFound();

  // Sourced research attached to this record. For Henry this is the candidate
  // evidence behind /compare; it adds no parent and no date to the tree.
  const evidence = evidenceForPerson(person);

  // Relatives come from the person's OWN cluster: a speculative profile must
  // never offer family-tree people as parents or partners, and vice versa.
  const cluster = person.cluster;
  const speculative = !isFamilyCluster(cluster);

  const [facts, comments, questions, images, people, unions, links] = await Promise.all([
    factsFor(id),
    commentsForPerson(id),
    questionsForPerson(id),
    imagesFor(id),
    allPeople(cluster),
    allUnions(cluster),
    childLinks(cluster),
  ]);

  const byId = new Map(people.map((p) => [p.id, p]));
  const myUnions = unions.filter((u) => u.partnerA === id || u.partnerB === id);
  const unionComments = (await Promise.all(myUnions.map((u) => commentsForUnion(u.id)))).flat();
  const allComments = [...comments, ...unionComments].sort((a, b) => a.createdAt - b.createdAt);

  const parentUnionIds = links.filter((l) => l.personId === id).map((l) => l.unionId);
  const parents = parentUnionIds.flatMap((uid) => {
    const u = unions.find((x) => x.id === uid);
    if (!u) return [];
    return [u.partnerA, ...(u.partnerB !== null ? [u.partnerB] : [])]
      .map((pid) => byId.get(pid))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  });
  const children = myUnions
    .flatMap((u) => links.filter((l) => l.unionId === u.id).map((l) => l.personId))
    .map((cid) => byId.get(cid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const siblings = parentUnionIds.flatMap((uid) =>
    links
      .filter((l) => l.unionId === uid && l.personId !== id)
      .map((l) => byId.get(l.personId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p)),
  );
  const partners = myUnions
    .map((u) => {
      const other = u.partnerA === id ? u.partnerB : u.partnerA;
      return other !== null ? (byId.get(other) ?? null) : null;
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="wrap py-10">
      <Link href="/" className="text-sm font-semibold text-kin-dark underline">
        ← Back to the tree
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">{person.fullName}</h1>
          {speculative && (
            <p className="mt-2">
              <Badge tone="amber">RESEARCH LINE · {cluster.toUpperCase()}</Badge>{" "}
              <span className="text-sm text-stone-600">
                A separate research cluster — not connected to the family tree.
              </span>
            </p>
          )}
          <p className="mt-1 text-stone-600">
            {lifespan(person)}
            {person.living && (
              <span className="ml-2">
                <Badge tone="green">LIVING</Badge>
              </span>
            )}
            {evidence && (
              <span className="ml-2">
                <Badge tone="amber">{evidence.status.toUpperCase()} · NOT PROVEN</Badge>
              </span>
            )}
          </p>
          {person.aliases.length > 0 && (
            <p className="mt-1 text-sm text-stone-600">
              Also recorded as: <span className="italic">{person.aliases.join(", ")}</span>
            </p>
          )}
          {person.nameNote && (
            <p className="mt-2 max-w-2xl text-sm italic text-stone-500">{person.nameNote}</p>
          )}
        </div>
        <Link
          href={`/person/${id}/edit`}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-kin hover:text-kin-dark"
        >
          Edit details
        </Link>
      </div>

      {evidence && (
        <div className="mt-8">
          <HenryEvidencePanel evidence={evidence} />
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <Card>
            <h2 className="text-lg font-extrabold text-stone-900">Facts &amp; sources</h2>
            <p className="mt-1 text-sm text-stone-600">
              Every dated event with where it came from. Add certificates, census entries and
              records here as the family finds them.
            </p>
            <FactsPanel
              personId={person.id}
              initial={facts.map((f) => ({
                id: f.id,
                kind: f.kind,
                detail: f.detail,
                source: f.source,
                sourceUrl: f.sourceUrl,
                sourceKind: f.sourceKind,
                confidence: f.confidence,
                createdBy: f.createdBy,
              }))}
            />
          </Card>

          <Card>
            <h2 className="text-lg font-extrabold text-stone-900">Images</h2>
            <p className="mt-1 text-sm text-stone-600">
              Certificates, registry screengrabs and photos for {person.fullName} — click any
              image to view it full size.
            </p>
            <ImagesPanel personId={person.id} personName={person.fullName} initial={images} />
          </Card>

          <Card>
            <h2 className="text-lg font-extrabold text-stone-900">Comments</h2>
            <p className="mt-1 text-sm text-stone-600">
              Notes, corrections and memories — visible to the whole family.
            </p>
            <div className="mt-4">
              <CommentForm personId={person.id} />
            </div>
            <ul className="mt-4 space-y-3">
              {allComments.length === 0 && (
                <li className="text-sm italic text-stone-500">No comments yet.</li>
              )}
              {allComments.map((c) => (
                <li key={c.id} className="rounded-lg bg-stone-50 p-3">
                  <p className="text-sm text-stone-800">{c.body}</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">
                    {c.author} · {new Date(c.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <QuestionSection
              personId={person.id}
              initial={questions}
              personName={person.fullName}
              aliases={person.aliases}
            />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">Family</h2>
            <div className="mt-3 space-y-4 text-sm">
              <FamilyRow label="Parents" people={parents} empty="Not recorded — add below." />
              <FamilyRow label="Partners" people={partners} empty="Not recorded." />
              <FamilyRow label="Siblings" people={siblings} empty="None recorded." />
              <FamilyRow label="Children" people={children} empty="None recorded." />
            </div>
          </Card>

          <AddRelativeCard personId={person.id} />
        </aside>
      </div>
    </div>
  );
}

function FamilyRow({
  label,
  people,
  empty,
}: {
  label: string;
  people: Person[];
  empty: string;
}) {
  return (
    <div>
      <p className="font-semibold text-stone-700">{label}</p>
      {people.length ? (
        <div className="mt-1 flex flex-wrap gap-2">
          {people.map((p) => (
            <PersonChip key={p.id} person={p} href={`/person/${p.id}`} />
          ))}
        </div>
      ) : (
        <p className="mt-1 text-stone-400">{empty}</p>
      )}
    </div>
  );
}
