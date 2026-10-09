import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  hashPassword,
  isLikelyEmail,
  newSessionToken,
  normalizeEmail,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth";
import { consumeInvite, insertSession, insertUser, userByEmail, validInvite, logActivity } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/join — invite-gated signup.
 * Body: { code, email, name, password }.
 * The OWNER_EMAIL env var grants the owner role to that address.
 */
export async function POST(req: Request) {
  let body: { code?: string; email?: string; name?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const code = (body.code ?? "").trim().toLowerCase();
  const email = normalizeEmail(body.email ?? "");
  const name = (body.name ?? "").trim();
  const password = body.password ?? "";

  if (!code || !isLikelyEmail(email) || !name || password.length < 8) {
    return NextResponse.json(
      { error: "invite code, name, valid email and a password of 8+ characters are required" },
      { status: 400 },
    );
  }

  if (!(await validInvite(code))) {
    return NextResponse.json({ error: "that invite code isn't valid" }, { status: 403 });
  }

  const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL ?? "");
  const role: "owner" | "member" = email === ownerEmail && ownerEmail !== "" ? "owner" : "member";

  if (await userByEmail(email)) {
    return NextResponse.json({ error: "that email is already registered — sign in instead" }, { status: 409 });
  }

  const now = Date.now();
  await insertUser(email, name, role, hashPassword(password), now);
  await consumeInvite(code, email, now);

  const token = newSessionToken();
  await insertSession(token, email, now, now + SESSION_TTL_MS);
  await logActivity(name, "joined", "the family site", `${name} joined via invite.`, now);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return NextResponse.json({ ok: true, name, role });
}
