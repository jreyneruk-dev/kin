import { NextResponse } from "next/server";
import { answerQuestion, getPerson, getSql, logActivity } from "@/lib/db";
import { parseSourceKind } from "@/lib/facts";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export type FindingPayload = {
  questionId: number;
  personId: number | null;
  detail: string;
  source: string | null;
  sourceUrl: string | null;
  sourceKind: string;
  confidence: string;
  close: boolean;
};

/**
 * POST /api/questions/:id/finding — "I found something" on a research question.
 * Files a sourced fact on the question's person (or an explicitly given one),
 * keeps the audit trail, and optionally closes the question. One transaction:
 * fact + question state land together or not at all.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const questionId = Number(idStr);
    if (!Number.isInteger(questionId)) {
      return NextResponse.json({ error: "bad id" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const detail = String(body.detail ?? "").trim();
    const sourceRaw = String(body.source ?? "") || null;
    const sourceUrlRaw = String(body.sourceUrl ?? "") || null;
    // Only http(s) renders as a link; drop anything else silently.
    const sourceUrl =
      sourceUrlRaw && /^https?:\/\/\S+$/i.test(sourceUrlRaw) ? sourceUrlRaw : null;
    const sourceKind = parseSourceKind(body.sourceKind);
    const confidence = ["documented", "likely", "guess"].includes(String(body.confidence))
      ? (String(body.confidence) as "documented" | "likely" | "guess")
      : "likely";
    const close = Boolean(body.close);

    if (!detail) return NextResponse.json({ error: "detail required" }, { status: 400 });

    const db = getSql();
    const qRows = await db`
      SELECT id, person_id, title FROM questions WHERE id = ${questionId}
    `;
    if (!qRows.length) return NextResponse.json({ error: "question not found" }, { status: 404 });
    const question = qRows[0];

    const personId = body.personId === undefined ? Number(question.person_id) : Number(body.personId);
    if (!Number.isInteger(personId) || !(await getPerson(personId))) {
      return NextResponse.json({ error: "person not found" }, { status: 404 });
    }

    const now = Date.now();
    const result = await db.begin(async (t) => {
      const factRows = await t`
        INSERT INTO facts (person_id, kind, detail, source, source_url, source_kind, confidence, created_by, created_at)
        VALUES (${personId}, 'note', ${detail.slice(0, 2000)}, ${sourceRaw?.slice(0, 300) ?? null},
                ${sourceUrl}, ${sourceKind}, ${confidence}, ${user.email}, ${now})
        RETURNING id
      `;
      const factId = Number(factRows[0].id);
      if (close) {
        await t`UPDATE questions SET status = 'answered', answered_at = ${now} WHERE id = ${questionId}`;
      }
      return { factId };
    });

    const person = await getPerson(personId);
    await logActivity(
      user.name,
      close ? "answered a question with a finding on" : "added a finding on",
      person?.fullName ?? `person ${personId}`,
      `${question.title} — ${detail.slice(0, 160)}`,
      now,
    );

    return NextResponse.json({ ok: true, factId: result.factId });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
