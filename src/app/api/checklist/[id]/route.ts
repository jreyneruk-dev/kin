import { NextResponse } from "next/server";
import type { ChecklistStatus } from "@/lib/types";
import { getSql, logActivity, updateChecklistItem } from "@/lib/db";
import { CHECKLIST_STATUS_LABEL, parseChecklistStatus } from "@/lib/checklist";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Long enough for a full reading, short enough to stay a note. */
const NOTE_MAX = 4000;

/**
 * PATCH /api/checklist/:id — record what a human read found on one of the
 * junction's open records. A partial patch is fine (the UI sends both), but an
 * explicit unknown status is refused rather than quietly ignored. The activity
 * log keeps who worked which record.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "bad id" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const db = getSql();
    const rows = await db`
      SELECT id, status, note, title FROM checklist_items WHERE id = ${id}
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "record not found" }, { status: 404 });
    }
    const current = rows[0];

    // The CHECK constraint already guarantees a known status; the cast mirrors
    // how every other row mapper reads an enum column back out.
    let status = String(current.status) as ChecklistStatus;
    if (body.status !== undefined) {
      const parsed = parseChecklistStatus(body.status);
      if (!parsed) return NextResponse.json({ error: "unknown status" }, { status: 400 });
      status = parsed;
    }

    const note = body.note === undefined ? String(current.note) : String(body.note).trim();
    if (note.length > NOTE_MAX) {
      return NextResponse.json(
        { error: `note is capped at ${NOTE_MAX} characters` },
        { status: 400 },
      );
    }

    const now = Date.now();
    const item = await updateChecklistItem(id, { status, note }, user.name, now);
    if (!item) return NextResponse.json({ error: "record not found" }, { status: 404 });

    await logActivity(
      user.name,
      "recorded a reading on",
      item.title,
      `${CHECKLIST_STATUS_LABEL[item.status]}${item.note ? ` — ${item.note.slice(0, 160)}` : ""}`,
      now,
    );

    return NextResponse.json({ ok: true, item });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
