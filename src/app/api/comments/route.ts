import { NextResponse } from "next/server";
import { getPerson, insertComment, logActivity } from "@/lib/db";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
    const personId = body.personId === undefined || body.personId === null ? null : Number(body.personId);
    const unionId = body.unionId === undefined || body.unionId === null ? null : Number(body.unionId);
    const text = String(body.body ?? "").trim();

    if (!text) return NextResponse.json({ error: "comment body required" }, { status: 400 });
    if (!personId && !unionId) {
      return NextResponse.json({ error: "personId or unionId required" }, { status: 400 });
    }
    if (personId && !(await getPerson(personId))) {
      return NextResponse.json({ error: "person not found" }, { status: 404 });
    }

    const now = Date.now();
    await insertComment({ personId, unionId, author: user.name, body: text.slice(0, 2000) }, now);
    const person = personId ? await getPerson(personId) : null;
    await logActivity(
      user.name,
      "commented on",
      person?.fullName ?? `family ${unionId}`,
      text.slice(0, 200),
      now,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
