import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  hashPassword,
  newSessionToken,
  normalizeEmail,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  verifyPassword,
} from "@/lib/auth";
import { insertSession, userByEmail } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  const row = await userByEmail(email);
  if (!row || !verifyPassword(password, String(row.password_hash))) {
    // Burn comparable CPU on the failure path so timing doesn't leak existence.
    hashPassword("decoy-password-value");
    return NextResponse.json({ error: "wrong email or password" }, { status: 401 });
  }

  const now = Date.now();
  const token = newSessionToken();
  await insertSession(token, email, now, now + SESSION_TTL_MS);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return NextResponse.json({ ok: true, name: String(row.name) });
}
