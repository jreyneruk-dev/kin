import { parseCluster, isFamilyCluster } from "@/lib/clusters";
import { gedcomFor } from "@/lib/export-cluster";
import { Forbidden, forbiddenResponse, Unauthorized, unauthorizedResponse, requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Owner-only GEDCOM export. Defaults to the family tree; `?cluster=<key>`
 * exports one research cluster instead (the only way speculative rows leave the
 * database in a file). An unknown key falls back to the family tree — a typo
 * must never dump a speculative line into a file someone treats as the tree.
 */
export async function GET(request: Request) {
  try {
    await requireOwner();
    const cluster = parseCluster(new URL(request.url).searchParams.get("cluster"));
    const ged = await gedcomFor(cluster);
    const stamp = new Date().toISOString().slice(0, 10);
    const suffix = isFamilyCluster(cluster) ? "" : `-${cluster}`;
    return new Response(ged, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="kin-export${suffix}-${stamp}.ged"`,
      },
    });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    if (e instanceof Forbidden) return forbiddenResponse();
    throw e;
  }
}
