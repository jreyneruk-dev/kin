/**
 * Auth: passphrase + DB-backed session tokens. No external deps —
 * scrypt from node:crypto, tokens are 32 random bytes (base64url).
 */

import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "kin_session";
export const SESSION_TTL_MS = 30 * 86_400_000; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sessionExpiry(now: number): number {
  return now + SESSION_TTL_MS;
}

/** Invite codes: readable, unambiguous, unguessable enough (8 chars). */
export function newInviteCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Constant-time string compare for cookie tokens. */
export function tokensMatch(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isLikelyEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function sessionUserFromRow(row: Record<string, unknown>): SessionUser {
  return {
    email: String(row.email),
    name: String(row.name),
    role: row.role === "owner" ? "owner" : "member",
  };
}
