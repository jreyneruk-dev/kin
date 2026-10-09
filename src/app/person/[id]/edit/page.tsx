import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { getPerson } from "@/lib/db";
import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();
  const person = await getPerson(id);
  if (!person) notFound();

  return (
    <div className="wrap max-w-2xl py-10">
      <Link href={`/person/${id}`} className="text-sm font-semibold text-kin-dark underline">
        ← Back to {person.fullName}
      </Link>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-stone-900">
        Edit {person.fullName}
      </h1>
      <p className="mt-2 text-sm text-stone-600">
        Changes are logged to the family activity feed. Leave unknowns blank.
      </p>
      <div className="mt-6">
        <EditForm person={person} />
      </div>
    </div>
  );
}
