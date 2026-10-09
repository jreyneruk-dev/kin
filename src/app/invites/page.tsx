import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { allInvites } from "@/lib/db";
import { SectionHeading } from "@/components/ui";
import { InviteCreator } from "./invite-creator";

export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "owner") redirect("/");

  const invites = await allInvites();

  return (
    <div className="wrap max-w-2xl py-10">
      <SectionHeading
        kicker="Owner tools"
        title="Invite codes"
        lede="Each code lets one person join. Send michael and your sister a code each — they pick their own password on arrival."
      />
      <InviteCreator />
      <ul className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {invites.map((inv, i) => (
          <li key={i} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-mono text-sm font-bold text-stone-900">{String(inv.code)}</p>
              {inv.note ? <p className="text-xs text-stone-500">{String(inv.note)}</p> : null}
              <p className="mt-0.5 text-xs text-stone-400">
                {inv.used_by
                  ? `used by ${String(inv.used_by)} on ${new Date(Number(inv.used_at)).toLocaleDateString("en-GB")}`
                  : `created ${new Date(Number(inv.created_at)).toLocaleDateString("en-GB")}`}
              </p>
            </div>
            {!inv.used_by && (
              <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">
                UNUSED
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
