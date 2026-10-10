import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { allFacts, allPeople, allQuestions, checklistItems } from "@/lib/db";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { surnameOf } from "@/lib/tree";
import { researchPack, splitFullName, surnameCandidates } from "@/lib/research-links";
import { checklistProgress } from "@/lib/checklist";
import { QuestionList } from "../question-list";
import { SearchPack } from "../search-pack";
import { FindingsForm } from "../findings-form";
import { JunctionChecklist } from "../junction-checklist";

export const dynamic = "force-dynamic";

const RECORD_SETS = [
  {
    name: "GRO birth index (England & Wales, free search)",
    why: "Birth registrations from Sept 1911 include the mother's maiden name — the fastest way to confirm the Macartney–Grainger marriage and any middle names (like the S in Kathleen S).",
    url: "https://www.gro.gov.uk/gro/content/certificates/",
  },
  {
    name: "FreeCen / FamilySearch census transcriptions",
    why: "The six siblings (1897–1905) should appear together in the 1901 and 1911 censuses with William H and Edith Maude — giving exact birthplaces for the whole family in one hit.",
    url: "https://www.familysearch.org/search/",
  },
  {
    name: "1939 Register (Findmypast/Ancestry, paid)",
    why: "Taken Sept 1939: shows each household member's birth date and occupation. Perfect for catching Kathleen and Aylwin's family, and exact birth dates for everyone.",
    url: "https://www.findmypast.co.uk/1939register",
  },
  {
    name: "GRO marriage index + certificates",
    why: "William H Macartney × Edith Maude Grainger's certificate names both fathers — the jump to the next generation back.",
    url: "https://www.gro.gov.uk/gro/content/certificates/",
  },
  {
    name: "UK outward passenger lists (1890–1960)",
    why: "If any sibling emigrated — and the Australia connection makes this likely — the passenger list gives destination, occupation and who travelled together.",
    url: "https://discovery.nationalarchives.gov.uk/",
  },
  {
    name: "Australian BDM indexes (NSW/VIC/QLD etc.)",
    why: "Michael's line: Joseph Fahey's marriage and children, and any Macartney siblings who ended up in Australia. Most state registries have free online indexes.",
    url: "https://www.naa.gov.au/",
  },
  {
    name: "Parish registers (baptisms & burials)",
    why: "Pre-1837 and for working-class families between censuses: parish records often name godparents (a clue to extended family) and give home villages.",
    url: "https://www.freereg.org.uk/",
  },
];

/** Fallback pack for questions without a linked person: surname candidates from the title itself. */
function singleQuestionPack(title: string, year: number | null) {
  const surnames = surnameCandidates(title, []);
  return [
    ...surnames.slice(0, 3).flatMap((s) => [
      {
        label: `FindMyPast — any ${s}`,
        url: `https://www.findmypast.co.uk/search/results?lastname=${encodeURIComponent(s)}` + (year ? `&yob=${year}&yorange=5` : ""),
        note: "free index search",
      },
      {
        label: `FreeBMD — any ${s}`,
        url: `https://www.freebmd.org.uk/cgi/search.pl?surname=${encodeURIComponent(s)}${year ? `&start=${year - 5}&end=${year + 5}` : ""}&type=Births`,
        note: "free England/Wales birth index",
      },
    ]),
    ...researchPack("", [], year),
  ];
}

const SURNAMES = [
  {
    name: "Macartney / McCartney",
    note: "Both spellings appear within one sibling group on the tree (Eileen and Charles as “McCartney”, the rest as “Macartney”). The name is Scottish/Irish (Mac Artain, “son of Artain”); English clerks wrote it phonetically, so search every variant: Macartney, McCartney, Mc'Cartney, M'Cartney, Cartney.",
  },
  {
    name: "Grainger",
    note: "An English occupational surname (grain merchant). Edith Maude was born 1874 — her birth and the family's origin should be in the 1881 census, free on FamilySearch.",
  },
  {
    name: "Fahey",
    note: "Irish (Ó Fathaigh), strongest in Co. Galway. Joseph (b. 1898) — if his family came from Ireland, check Irish civil registration (free index at irishgenealogy.ie) from 1864.",
  },
  {
    name: "Davies",
    note: "Very common in Wales and the Welsh borders. Aylwin P Davies is the rare first name — a middle initial plus an unusual forename is a gift for searching.",
  },
  {
    name: "Reynolds",
    note: "English and Irish. Mary E (b. 1890) married Richard H Macartney; the marriage certificate will name her father.",
  },
  {
    name: "Cumming",
    note: "Scottish (Clan Comyn). Ruby × William J Cumming's marriage record will anchor the last sibling branch.",
  },
];

export default async function ResearchPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const [questions, people, facts, checklist] = await Promise.all([
    allQuestions(),
    allPeople(),
    allFacts(),
    checklistItems(),
  ]);

  const withGaps = people.filter((p) => !p.birthDate || (!p.living && !p.deathDate) || !p.birthPlace);
  const branches = [...new Set(people.map((p) => surnameOf(p.fullName)))].sort();
  const sourcedFacts = facts.filter((f) => f.source).length;
  const progress = checklistProgress(checklist);
  const openQuestions = questions.filter((q) => q.status === "open").length;
  const kicker = [
    `${openQuestions} open questions`,
    `${withGaps.length} people with gaps`,
    `${sourcedFacts} sourced facts`,
    ...(progress.total > 0 ? [`${progress.read}/${progress.total} junction records read`] : []),
  ].join(" · ");

  return (
    <div className="wrap py-10">
      <SectionHeading
        kicker={kicker}
        title="Research hub"
        lede="Where the tree has holes, and exactly which records to look at next. Everything here is curated for this family — the questions, the gaps, and the surname background."
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-extrabold text-stone-900">The gaps to fill first</h2>
          <p className="mt-1 text-sm text-stone-600">
            Highest-value missing records, in the order they unblock everything else.
          </p>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-stone-700">
            <li>
              <strong>William H × Edith Maude&apos;s marriage certificate</strong> — names both
              fathers; reaches the next generation back on the Macartney and Grainger lines at once.
            </li>
            <li>
              <strong>Birth registrations for the six siblings (1897–1905)</strong> — the GRO index
              gives the mother&apos;s maiden name and full middle names (including Kathleen&apos;s “S”).
            </li>
            <li>
              <strong>1901 &amp; 1911 census entries</strong> — exact birthplaces for the whole family,
              plus Edith&apos;s children&apos;s names to cross-check the tree.
            </li>
            <li>
              <strong>Kathleen × Aylwin Davies&apos; marriage</strong> — connects your branch; the
              certificate gives ages, addresses and fathers.
            </li>
            <li>
              <strong>The Australia link</strong> — passenger lists and Australian BDM for any
              sibling who emigrated, and for michael&apos;s Fahey line.
            </li>
          </ol>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold text-stone-900">Surname backgrounds</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {SURNAMES.map((s) => (
              <div key={s.name} className="rounded-lg border border-stone-200 p-3">
                <dt className="font-bold text-stone-900">{s.name}</dt>
                <dd className="mt-1 text-stone-600">{s.note}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-extrabold text-stone-900">Record sets, and why each one matters here</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {RECORD_SETS.map((r) => (
              <li key={r.name} className="rounded-lg border border-stone-200 p-4">
                <a href={r.url} target="_blank" rel="noreferrer" className="font-bold text-kin-dark underline">
                  {r.name}
                </a>
                <p className="mt-1 text-sm text-stone-600">{r.why}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {checklist.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-extrabold tracking-tight text-stone-900">
            The junction checklist
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-stone-600">
            Henry Macartney — the “farmer” in the 1870 St Mark&apos;s marriage register — has no
            place yet, and until he has one the question of a Lissanoure connection cannot be
            tested. These are the records that can give him one: open a record, set its status,
            and write down what the reading found.{" "}
            <Link href="/lissanoure" className="font-semibold text-kin-dark underline">
              See the documented line →
            </Link>
          </p>
          <div className="mt-4">
            <JunctionChecklist items={checklist} />
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-extrabold tracking-tight text-stone-900">People with gaps</h2>
        <p className="mt-1 text-sm text-stone-600">
          Each flag is a to-do: find the record, add a fact with its source, tick the badge off by
          editing the person.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withGaps.map((p) => (
            <Link
              key={p.id}
              href={`/person/${p.id}`}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:border-kin"
            >
              <p className="font-bold text-stone-900">{p.fullName}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {!p.birthDate && <Badge tone="amber">birth?</Badge>}
                {!p.living && !p.deathDate && <Badge tone="amber">death?</Badge>}
                {!p.birthPlace && <Badge tone="amber">place?</Badge>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-extrabold tracking-tight text-stone-900">Open questions</h2>
        <ul className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {questions.filter((q) => q.status === "open").map((q) => {
            const person = q.personId ? people.find((p) => p.id === q.personId) : null;
            const yearMatch = /\b(1[89]\d{2}|20\d{2})\b/.exec(q.detail ?? q.title);
            const year = yearMatch ? Number(yearMatch[1]) : null;
            const targets = person
              ? researchPack(person.fullName, person.aliases, year)
              : singleQuestionPack(q.title, year);
            return (
              <li key={q.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{q.title}</p>
                    {q.detail && <p className="mt-1 max-w-3xl text-sm text-stone-600">{q.detail}</p>}
                    {person && (
                      <Link href={`/person/${person.id}`} className="mt-1 inline-block text-xs font-semibold text-kin-dark underline">
                        Open profile →
                      </Link>
                    )}
                    <p className="mt-1 text-xs text-stone-400">raised by {q.raisedBy}</p>
                  </div>
                </div>
                <SearchPack targets={targets} />
                <div className="mt-2">
                  <FindingsForm questionId={q.id} />
                </div>
              </li>
            );
          })}
        </ul>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-bold text-stone-700">
            Answered questions ({questions.filter((q) => q.status === "answered").length})
          </summary>
          <QuestionList questions={questions.filter((q) => q.status === "answered")} />
        </details>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-extrabold tracking-tight text-stone-900">Branches</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {branches.map((b) => (
            <span key={b} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm">
              {b}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
