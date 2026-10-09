/**
 * One GEDCOM for one cluster.
 *
 * gedcom-export.ts is deliberately pure, so the composition — which cluster's
 * rows go in — lives here, where the export route and its test share exactly
 * the same code path. Exporting the family tree must never include a
 * speculative line, which is why the default is the family cluster and an
 * unknown `?cluster=` value falls back to it (parseCluster).
 */

import { allFacts, allPeople, allUnions, childLinks } from "./db";
import { FAMILY_CLUSTER } from "./clusters";
import { exportGedcom } from "./gedcom-export";

export async function gedcomFor(cluster: string = FAMILY_CLUSTER): Promise<string> {
  const [people, unions, links, facts] = await Promise.all([
    allPeople(cluster),
    allUnions(cluster),
    childLinks(cluster),
    allFacts(cluster),
  ]);
  return exportGedcom({ people, unions, childLinks: links, facts });
}
