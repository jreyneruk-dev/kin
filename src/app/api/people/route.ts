import { NextResponse } from "next/server";
import type { Sex } from "@/lib/types";
import { createPersonWithLink, logActivity } from "@/lib/db";
import { deriveLiving } from "@/lib/facts";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/people
 * Body: {
 *   fullName, sex?, birthDate?, birthPlace?, deathDate?, deathPlace?, notes?, living?,
 *   link?: { kind: "child-of" | "partner-of" | "parent-of", unionId?: number, personId?: number }
 * }
 * - child-of + unionId: adds the new person as a child of that union.
 * - child-of + personId: adds the new person as a child of personId's first union
 *   (creating one with an empty partner slot if they have none).
 * - partner-of + personId: creates a new union between the new person and personId.
 * - parent-of + personId: the new person becomes a *parent* of personId — either
 *   filling the empty partner slot in personId's existing parent union, or by
 *   creating a new union with the new person in it and personId as its child.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const fullName = String(body.fullName ?? "").trim();
    if (!fullName) return NextResponse.json({ error: "fullName is required" }, { status: 400 });

    const sex = body.sex === "f" || body.sex === "m" || body.sex === "x" ? (body.sex as Sex) : null;
    const str = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s === "" ? null : s;
    };
    const now = Date.now();

    const link = body.link as
      | { kind?: string; unionId?: number; personId?: number }
      | undefined;

    // Person + family link commit atomically in one pooler transaction.
    const { person } = await createPersonWithLink(
      {
        fullName,
        nameNote: str(body.nameNote),
        aliases: Array.isArray(body.aliases)
          ? body.aliases.map((a) => String(a).trim()).filter(Boolean)
          : typeof body.aliases === "string" && body.aliases.trim()
            ? body.aliases.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
        sex,
        birthDate: str(body.birthDate),
        birthPlace: str(body.birthPlace),        deathDate: str(body.deathDate),
        deathPlace: str(body.deathPlace),
        notes: str(body.notes),
        // Alive-by-default: the tick box derives from the death fields — a
        // recorded death wins over whatever the form sent (see deriveLiving).
        living: deriveLiving({
          deathDate: str(body.deathDate),
          deathPlace: str(body.deathPlace),
          living: body.living === undefined ? true : Boolean(body.living),
        }),
        createdBy: user.email,
      },
      now,
      link?.kind === "child-of" && link.personId
        ? { kind: "child-of", parentId: link.personId }
        : link?.kind === "parent-of" && link.personId
          ? { kind: "parent-of", childId: link.personId, marriageDate: str(body.marriageDate), marriagePlace: str(body.marriagePlace) }
          : link?.kind === "partner-of" && link.personId
            ? { kind: "partner-of", partnerId: link.personId, marriageDate: str(body.marriageDate), marriagePlace: str(body.marriagePlace) }
            : null,
    );

    await logActivity(
      user.name,
      "added",
      person.fullName,
      `New person in the tree (${str(body.birthDate) ?? "dates unknown"}).`,
      now,
    );

    return NextResponse.json({ ok: true, id: person.id });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
