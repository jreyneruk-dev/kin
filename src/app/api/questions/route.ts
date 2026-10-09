import { NextResponse } from "next/server";
import { answerQuestion, getPerson, insertQuestion, logActivity, reopenQuestion } from "@/lib/db";
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
    const title = String(body.title ?? "").trim();
    const detail = String(body.detail ?? "").trim() || null;
    const personId = body.personId === undefined || body.personId === null ? null : Number(body.personId);
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (personId && !(await getPerson(personId))) {
      return NextResponse.json({ error: "person not found" }, { status: 404 });
    }
    const now = Date.now();
    await insertQuestion({ personId, title: title.slice(0, 300), detail, raisedBy: user.name, createdAt: now }, now);
    const person = personId ? await getPerson(personId) : null;
    await logActivity(user.name, "asked about", person?.fullName ?? "the research", title.slice(0, 200), now);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    let body: { id?: number; action?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
    const id = Number(body.id);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "id required" }, { status: 400 });
    const now = Date.now();
    if (body.action === "answer") {
      await answerQuestion(id, now);
      await logActivity(user.name, "answered a question", "on the research list", null, now);
    } else if (body.action === "reopen") {
      await reopenQuestion(id);
      await logActivity(user.name, "reopened a question", "on the research list", null, now);
    } else {
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
