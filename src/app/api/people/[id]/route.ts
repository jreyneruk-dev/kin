import { NextResponse } from "next/server";
import type { Person, Sex } from "@/lib/types";
import { getPerson, logActivity, updatePerson } from "@/lib/db";
import { deriveLiving } from "@/lib/facts";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const existing = await getPerson(id);
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const str = (v: unknown, fallback: string | null) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };

    // Compute death fields first so the Alive flag can derive from them.
    const deathDate = body.deathDate === undefined ? existing.deathDate : str(body.deathDate, existing.deathDate);
    const deathPlace = body.deathPlace === undefined ? existing.deathPlace : str(body.deathPlace, existing.deathPlace);

    const next: Person = {
      ...existing,
      fullName: String(body.fullName ?? existing.fullName).trim() || existing.fullName,
      nameNote: body.nameNote === undefined ? existing.nameNote : str(body.nameNote, existing.nameNote),
      aliases:
        body.aliases === undefined
          ? existing.aliases
          : String(body.aliases)
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean),
      sex: body.sex === undefined ? existing.sex : ((body.sex as Sex) ?? null),
      birthDate: body.birthDate === undefined ? existing.birthDate : str(body.birthDate, existing.birthDate),
      birthPlace: body.birthPlace === undefined ? existing.birthPlace : str(body.birthPlace, existing.birthPlace),
      deathDate,
      deathPlace,
      notes: body.notes === undefined ? existing.notes : str(body.notes, existing.notes),
      // The Alive tick box: derive from the death fields so a recorded death
      // always unticks it, while a user hand-untick (no death recorded) sticks.
      living: deriveLiving({
        deathDate,
        deathPlace,
        living: body.living === undefined ? existing.living : Boolean(body.living),
      }),
    };

    const updated = await updatePerson(id, next);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });

    await logActivity(
      user.name,
      "updated",
      updated.fullName,
      body.changeNote ? String(body.changeNote).slice(0, 300) : null,
      Date.now(),
    );
    return NextResponse.json({ ok: true, person: updated });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
