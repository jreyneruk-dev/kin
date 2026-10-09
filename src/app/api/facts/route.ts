import { NextResponse } from "next/server";
import type { Confidence, FactKind } from "@/lib/types";
import { getPerson, insertFact, logActivity } from "@/lib/db";
import { parseSourceKind } from "@/lib/facts";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const KINDS: FactKind[] = [
  "birth", "baptism", "marriage", "death", "burial",
  "residence", "emigration", "occupation", "census", "military", "note",
];

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
    const personId = Number(body.personId);
    const kind = String(body.kind ?? "") as FactKind;
    const detail = String(body.detail ?? "").trim();
    const source = String(body.source ?? "").trim() || null;
    const sourceUrlRaw = String(body.sourceUrl ?? "").trim() || null;
    // Only accept http(s) URLs — this ends up rendered as a link.
    const sourceUrl =
      sourceUrlRaw && /^https?:\/\/\S+$/i.test(sourceUrlRaw) ? sourceUrlRaw : null;
    const sourceKind = parseSourceKind(body.sourceKind);
    const note = String(body.note ?? "").trim();
    const confidence = (["documented", "likely", "guess"] as Confidence[]).includes(
      body.confidence as Confidence,
    )
      ? (body.confidence as Confidence)
      : "documented";

    if (!Number.isInteger(personId) || !KINDS.includes(kind) || !detail) {
      return NextResponse.json({ error: "personId, kind and detail are required" }, { status: 400 });
    }
    if (!(await getPerson(personId))) {
      return NextResponse.json({ error: "person not found" }, { status: 404 });
    }

    const now = Date.now();
    const fact = await insertFact(
      { personId, kind, detail, source, sourceUrl, sourceKind, confidence, createdBy: user.email },
      now,
    );
    const person = await getPerson(personId);
    await logActivity(
      user.name,
      "added a fact to",
      person?.fullName ?? `person ${personId}`,
      `${kind}: ${detail.slice(0, 200)}${note ? ` — ${note.slice(0, 200)}` : ""}`,
      now,
    );
    return NextResponse.json({ ok: true, fact });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
