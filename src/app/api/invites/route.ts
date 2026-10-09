import { NextResponse } from "next/server";
import { newInviteCode } from "@/lib/auth";
import { allInvites, insertInvite, logActivity } from "@/lib/db";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== "owner") {
      return NextResponse.json({ error: "owner only" }, { status: 403 });
    }
    return NextResponse.json({ invites: await allInvites() });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (user.role !== "owner") {
      return NextResponse.json({ error: "owner only" }, { status: 403 });
    }
    let body: { note?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = {};
    }
    const code = newInviteCode();
    const now = Date.now();
    await insertInvite(code, (body.note ?? "").slice(0, 200), user.email, now);
    await logActivity(user.email, "created an invite", "for the family site", body.note ?? null, now);
    return NextResponse.json({ ok: true, code });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
