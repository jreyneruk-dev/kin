/**
 * Pure helpers for the junction checklist — the open records behind the
 * Henry Macartney question (docs/henry-origin-2026-10-09.md). No DB, no
 * React: everything here is unit-tested.
 */

import type { ChecklistItem, ChecklistStatus } from "./types";

/** Every status a checklist row can hold, in working order. */
export const CHECKLIST_STATUSES = ["todo", "doing", "found", "negative", "blocked"] as const;

/**
 * Human labels. "Nothing found" is a result, not a failure: it is the same
 * pertinent negative the facts table records as source kind 'negative'.
 */
export const CHECKLIST_STATUS_LABEL: Record<ChecklistStatus, string> = {
  todo: "to do",
  doing: "in progress",
  found: "found something",
  negative: "nothing found",
  blocked: "blocked",
};

/** Accept a status from a payload; null means "not a status we know". */
export function parseChecklistStatus(v: unknown): ChecklistStatus | null {
  return (CHECKLIST_STATUSES as readonly unknown[]).includes(v) ? (v as ChecklistStatus) : null;
}

/** A record counts as read once someone has recorded an outcome — found or not. */
export function isRead(item: Pick<ChecklistItem, "status">): boolean {
  return item.status === "found" || item.status === "negative";
}

/** Progress for the hub kicker and the section headers. */
export function checklistProgress(items: Pick<ChecklistItem, "status">[]): {
  read: number;
  total: number;
  blocked: number;
} {
  return {
    read: items.filter(isRead).length,
    total: items.length,
    blocked: items.filter((i) => i.status === "blocked").length,
  };
}

/** Group rows by section, preserving the order the query (sort_order) gives. */
export function groupChecklist<T extends { section: string }>(
  items: T[],
): { section: string; items: T[] }[] {
  const bySection = new Map<string, T[]>();
  for (const item of items) {
    const list = bySection.get(item.section) ?? [];
    list.push(item);
    bySection.set(item.section, list);
  }
  return [...bySection].map(([section, list]) => ({ section, items: list }));
}
