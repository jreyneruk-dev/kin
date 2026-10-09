/**
 * Pure tree logic: build a graph from people/unions/child links, find the
 * connected component around a root person, and lay it out by generation.
 * No DB, no React — everything here is unit-testable.
 */

import type { Person, Union } from "./types";

export interface TreeInput {
  people: Person[];
  unions: Union[];
  childLinks: { unionId: number; personId: number }[];
}

export interface TreeNode {
  person: Person;
  parents: number[]; // union ids this person is a child of
  unions: number[]; // union ids this person is a partner in
}

export interface TreeGraph {
  nodes: Map<number, TreeNode>;
  unions: Map<number, Union>;
  childLinks: { unionId: number; personId: number }[];
  childLinksOf(unionId: number): number[];
}

export function buildGraph(input: TreeInput): TreeGraph {
  const nodes = new Map<number, TreeNode>();
  for (const p of input.people) {
    nodes.set(p.id, { person: p, parents: [], unions: [] });
  }
  const unions = new Map<number, Union>();
  for (const u of input.unions) {
    unions.set(u.id, u);
    const a = nodes.get(u.partnerA);
    if (a) a.unions.push(u.id);
    if (u.partnerB !== null) {
      const b = nodes.get(u.partnerB);
      if (b) b.unions.push(u.id);
    }
  }
  const links = [...input.childLinks];
  for (const link of links) {
    const child = nodes.get(link.personId);
    if (child) child.parents.push(link.unionId);
  }
  return {
    nodes,
    unions,
    childLinks: links,
    childLinksOf(unionId: number): number[] {
      return links.filter((l) => l.unionId === unionId).map((l) => l.personId);
    },
  };
}

/** Married/last surname helper: "Kathleen S Macartney" → "Macartney". */
export function surnameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : fullName;
}

/** People connected (transitively) to the root person by blood or marriage. */
export function connectedComponent(graph: TreeGraph, rootId: number): Set<number> {
  const seen = new Set<number>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.pop() as number;
    const node = graph.nodes.get(id);
    if (!node) continue;
    const neighbours: number[] = [];
    for (const uid of node.unions) {
      const u = graph.unions.get(uid);
      if (!u) continue;
      neighbours.push(u.partnerA);
      if (u.partnerB !== null) neighbours.push(u.partnerB);
      neighbours.push(...graph.childLinksOf(uid));
    }
    for (const uid of node.parents) {
      const u = graph.unions.get(uid);
      if (!u) continue;
      neighbours.push(u.partnerA);
      if (u.partnerB !== null) neighbours.push(u.partnerB);
      neighbours.push(...graph.childLinksOf(uid));
    }
    for (const n of neighbours) {
      if (n !== null && !seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return seen;
}

export interface Generation {
  level: number; // 0 = eldest shown
  people: Person[];
}

/**
 * Generational layout around a root: walk up through parents, then down
 * through children (children sit one below their highest parent), then snap
 * spouses without parentage to their partner's level.
 */
export function generationsOf(graph: TreeGraph, rootId: number): Generation[] {
  const component = connectedComponent(graph, rootId);
  const depth = new Map<number, number>();

  const upward = (id: number, d: number): void => {
    const known = depth.get(id);
    if (known !== undefined && known >= d) return; // already at least this high
    depth.set(id, d);
    const node = graph.nodes.get(id);
    if (!node) return;
    for (const uid of node.parents) {
      const u = graph.unions.get(uid);
      if (!u) continue;
      upward(u.partnerA, d - 1);
      if (u.partnerB !== null) upward(u.partnerB, d - 1);
    }
  };
  upward(rootId, 0);

  // Downward: children sit one below their highest parent.
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 100) {
    changed = false;
    for (const link of graph.childLinks) {
      const u = graph.unions.get(link.unionId);
      if (!u) continue;
      const pa = depth.get(u.partnerA);
      const pb = u.partnerB !== null ? depth.get(u.partnerB) : undefined;
      const parentDepth = Math.max(pa ?? -Infinity, pb ?? -Infinity);
      if (parentDepth === -Infinity) continue;
      const childDepth = depth.get(link.personId);
      if (childDepth === undefined || childDepth < parentDepth + 1) {
        depth.set(link.personId, parentDepth + 1);
        changed = true;
      }
    }
  }

  // Everyone in the component needs a row, even when they have no upward
  // path: a parent recorded on their child's marriage register with the
  // other parent still unknown (an open partner_b slot) is reached only via
  // that children(row) link — e.g. Alfred Grainger, Edith's father via a
  // union with partner_b null, whose child is the root's SPOUSE, so the
  // upward walk and the spouse-snap never reach him. Fixed point, bounded
  // like the downward pass: spouses snap to their placed partner; co-parents
  // of a placed child snap one level above it.
  let snapped = true;
  let snapper = 0;
  while (snapped && snapper++ < 100) {
    snapped = false;
    for (const [id, node] of graph.nodes) {
      if (!component.has(id) || depth.has(id)) continue;
      for (const uid of node.unions) {
        const u = graph.unions.get(uid);
        if (!u) continue;
        const other = u.partnerA === id ? u.partnerB : u.partnerA;
        if (other !== null && other !== id && depth.has(other)) {
          depth.set(id, depth.get(other) as number);
          snapped = true;
          break;
        }
      }
      if (depth.has(id)) continue; // snagged by the spouse rule above
      for (const uid of node.unions) {
        const u = graph.unions.get(uid);
        if (!u) continue;
        const childDepths = graph
          .childLinksOf(uid)
          .map((c) => depth.get(c))
          .filter((d): d is number => d !== undefined);
        if (childDepths.length) {
          // Co-parent of a placed child: parents sit one above the child.
          depth.set(id, Math.max(...childDepths) - 1);
          snapped = true;
          break;
        }
      }
    }
  }

  const levels = new Map<number, Person[]>();
  for (const [id, d] of depth) {
    if (!component.has(id)) continue;
    const person = graph.nodes.get(id)?.person;
    if (!person) continue;
    const arr = levels.get(d) ?? [];
    arr.push(person);
    levels.set(d, arr);
  }
  const keys = [...levels.keys()].sort((a, b) => a - b);
  return keys.map((d, i) => ({ level: i, people: levels.get(d) ?? [] }));
}
