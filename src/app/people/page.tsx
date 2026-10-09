import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { allFacts, allPeople } from "@/lib/db";
import { Badge, Card, lifespan, SectionHeading } from "@/components/ui";
import { surnameOf } from "@/lib/tree";
import { completenessOf, nameMatches } from "@/lib/facts";
import { PeopleSearch } from "./people-search";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [people, facts] = await Promise.all([allPeople(), allFacts()]);
  const factsByPerson = new Map<number, typeof facts>();
  for (const f of facts) {
    const arr = factsByPerson.get(f.personId) ?? [];
    arr.push(f);
    factsByPerson.set(f.personId, arr);
  }

  const branches = [...new Set(people.map((p) => surnameOf(p.fullName)))].sort();

  const rows = people.map((p) => {
    const c = completenessOf(p, factsByPerson.get(p.id) ?? []);
    return {
      id: p.id,
      fullName: p.fullName,
      aliases: p.aliases,
      dates: lifespan(p),
      sex: p.sex,
      living: p.living,
      branch: surnameOf(p.fullName),
      sourcedFacts: c.sourcedFacts,
      totalFacts: c.totalFacts,
      missing: c.missing,
    };
  });

  return (
    <div className="wrap py-10">
      <SectionHeading
        kicker={`${people.length} people`}
        title="Everyone in the tree"
        lede="The amber flags show where the record is incomplete — each one is a research opportunity. Search covers nicknames and spelling variants too."
      />
      <PeopleSearch rows={rows} branches={branches} />
    </div>
  );
}
