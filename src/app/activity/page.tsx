import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { recentActivity } from "@/lib/db";
import { EmptyNote, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const activity = await recentActivity(100);

  return (
    <div className="wrap max-w-3xl py-10">
      <SectionHeading
        kicker="Who changed what"
        title="Family activity"
        lede="Every addition and correction, newest first — so nothing is lost and everything is attributable."
      />
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
        {activity.map((a, i) => {
          const detail = a.detail === null || a.detail === undefined ? null : String(a.detail);
          return (
            <li key={i} className="p-4">
              <p className="text-sm text-stone-800">
                <span className="font-bold">{String(a.actor)}</span> {String(a.verb)}{" "}
                <span className="font-semibold">{String(a.target)}</span>
              </p>
              {detail && <p className="mt-1 text-sm text-stone-600">{detail}</p>}
              <p className="mt-1 text-xs text-stone-400">
                {new Date(Number(a.created_at)).toLocaleString("en-GB")}
              </p>
            </li>
          );
        })}
        {activity.length === 0 && (
          <li className="p-6">
            <EmptyNote>Nothing logged yet.</EmptyNote>
          </li>
        )}
      </ul>
    </div>
  );
}
