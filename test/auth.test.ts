import { describe, expect, it } from "vitest";
import {
  hashPassword,
  isLikelyEmail,
  newInviteCode,
  normalizeEmail,
  parseCookies,
  tokensMatch,
  verifyPassword,
} from "@/lib/auth";

describe("passwords", () => {
  it("hashes and verifies", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("salts so two hashes differ", () => {
    expect(hashPassword("x")).not.toBe(hashPassword("x"));
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "plain:text")).toBe(false);
  });
});

describe("tokens", () => {
  it("compares equal tokens", () => {
    expect(tokensMatch("abc", "abc")).toBe(true);
    expect(tokensMatch("abc", "abd")).toBe(false);
  });

  it("session tokens are long and unique", () => {
    const seen = new Set([1, 2, 3].map(() => newInviteCode()));
    expect(seen.size).toBe(3);
  });
});

describe("invite codes", () => {
  it("uses the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = newInviteCode();
      expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{8}$/);
      expect(code).not.toMatch(/[lio01]/);
    }
  });
});

describe("email helpers", () => {
  it("normalizes", () => {
    expect(normalizeEmail("  John@Example.COM ")).toBe("john@example.com");
  });

  it("validates loosely", () => {
    expect(isLikelyEmail("a@b.co")).toBe(true);
    expect(isLikelyEmail("not-an-email")).toBe(false);
  });
});

describe("cookies", () => {
  it("parses a session cookie out of a header", () => {
    const parsed = parseCookies("other=1; kin_session=tok%20en; x=y");
    expect(parsed.kin_session).toBe("tok en");
  });

  it("handles empty headers", () => {
    expect(parseCookies(null)).toEqual({});
  });
});
