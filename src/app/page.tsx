import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import {
  allPeople,
  allQuestions,
  allUnions,
  childLinks,
  recentActivity,
} from "@/lib/db";
import { buildGraph, generationsOf, surnameOf } from "@/lib/tree";
import { Card, EmptyNote, SectionHeading, Badge } from "@/components/ui";
import { TreeBoard } from "./tree-board";
import { QuestionList } from "./question-list";

export const dynamic = "force-dynamic";

export default async function TreePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [people, unions, links, questions, activity] = await Promise.all([
    allPeople(),
    allUnions(),
    childLinks(),
    allQuestions(),
    recentActivity(8),
  ]);

  const graph = buildGraph({ people, unions, childLinks: links });
  // Anchor the layout on the tree's patriarch: William H Macartney.
  const anchor = people.find((p) => surnameOf(p.fullName) === "Macartney" && p.birthDate === "1871");
  const rootId = anchor?.id ?? people[0]?.id;
  const generations = rootId ? generationsOf(graph, rootId) : [];

  const branches = [...new Set(people.map((p) => surnameOf(p.fullName)))].sort();
  const openQuestions = questions.filter((q) => q.status === "open");
  const byPerson = (id: number) => people.find((p) => p.id === id);

  return (
    <div className="wrap py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          kicker={`${people.length} people · ${unions.length} couples`}
          title="Family tree"
          lede="Click anyone to open their profile. Add parents, partners or children from any profile — the tree grows as the family does."
        />
        {user.role === "owner" && (
          <Link
            href="/invites"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-kin hover:text-kin-dark"
          >
            Invites
          </Link>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <TreeBoard
            generations={generations.map((g) => ({
              level: g.level,
              people: g.people.map((p) => ({
                id: p.id,
                fullName: p.fullName,
                dates: p.birthDate || p.deathDate ? `${p.birthDate ?? "?"} – ${p.living ? "living" : (p.deathDate ?? "?")}` : "dates unknown",
                sex: p.sex,
                living: p.living,
              })),
            }))}
            unions={unions.map((u) => ({ id: u.id, a: u.partnerA, b: u.partnerB }))}
            branches={branches}
          />
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">
              Open questions
            </h2>
            <div className="mt-3 space-y-3">
              {openQuestions.length === 0 && <EmptyNote>None yet — add one from any profile.</EmptyNote>}
              {openQuestions.slice(0, 4).map((q) => (
                <div key={q.id} className="text-sm">
                  <p className="font-semibold text-stone-800">{q.title}</p>
                  {q.personId && byPerson(q.personId) && (
                    <Link
                      href={`/person/${q.personId}`}
                      className="text-xs font-semibold text-kin-dark underline"
                    >
                      {byPerson(q.personId)!.fullName}
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <Link href="/research" className="mt-4 inline-block text-sm font-semibold text-kin-dark underline">
              All research →
            </Link>
          </Card>

          <Card>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">Recent activity</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {activity.map((a, i) => (
                <li key={i} className="text-stone-700">
                  <span className="font-semibold">{String(a.actor)}</span> {String(a.verb)}{" "}
                  <span className="font-medium">{String(a.target)}</span>
                </li>
              ))}
              {activity.length === 0 && <EmptyNote>Nothing yet.</EmptyNote>}
            </ul>
            <Link href="/activity" className="mt-4 inline-block text-sm font-semibold text-kin-dark underline">
              Full log →
            </Link>
          </Card>

          <Card className="bg-parchment">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-stone-500">How this works</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-stone-700">
              <li>Open a profile to add facts, sources, comments and questions.</li>
              <li>Use a comment to suggest a correction — everyone sees it.</li>
              <li>Tick questions off in <Link className="underline" href="/research">Research</Link>.</li>
            </ul>
            <div className="mt-3">
              <Badge tone="kin">{user.name}</Badge>
            </div>
          </Card>
        </aside>
      </div>

      <QuestionList questions={questions.slice(0, 20)} />
    </div>
  );
}
