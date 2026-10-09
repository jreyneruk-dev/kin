/**
 * Server helpers for resolving the signed-in user from the session cookie.
 * Route handlers call requireUser(); server components call getUser().
 */

import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./auth";
import { getSql, sessionUser } from "./db";
import type { SessionUser } from "./types";

export async function getUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await sessionUser(token, Date.now());
}

/** For route handlers: throws a typed marker when unauthenticated. */
export class Unauthorized extends Error {
  constructor() {
    super("unauthorized");
  }
}

/** For owner-only routes (imports, invites maintenance). */
export class Forbidden extends Error {
  constructor() {
    super("owner only");
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) throw new Unauthorized();
  return user;
}

export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") throw new Forbidden();
  return user;
}

export function forbiddenResponse(): Response {
  return new Response(JSON.stringify({ error: "owner account required" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "sign in required" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
