import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { ImportWizard } from "./import-wizard";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "owner") redirect("/");

  return (
    <div className="wrap max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Import &amp; backup</h1>
      <p className="mt-2 text-sm text-stone-600">
        Bring a GEDCOM file in (michael&apos;s Ancestry tree exports as one: Tree pages →
        <span className="italic"> Tree settings → Export tree</span>), and take the whole tree
        out as a backup whenever you like. Owner only.
      </p>
      <ImportWizard />
    </div>
  );
}
