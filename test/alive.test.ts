import { describe, expect, it } from "vitest";
import { deriveLiving } from "../src/lib/facts";

describe("deriveLiving (the Alive tick box)", () => {
  it("defaults to alive — no death recorded", () => {
    expect(deriveLiving({ deathDate: null, deathPlace: null, living: true })).toBe(true);
    expect(deriveLiving({ deathDate: null, deathPlace: null, living: false })).toBe(false); // user unticked by hand
  });

  it("goes clear when a death date exists", () => {
    expect(deriveLiving({ deathDate: "1970-03-14", deathPlace: null, living: true })).toBe(false);
  });

  it("goes clear when only a death place is known", () => {
    expect(deriveLiving({ deathDate: null, deathPlace: "Plymouth, Devon", living: true })).toBe(false);
  });

  it("stays clear once a death was recorded, even if the form sends living=true", () => {
    // The stored-flag-true + death-recorded combination must never render as alive.
    expect(deriveLiving({ deathDate: "1853", deathPlace: "Belfast, Ireland", living: true })).toBe(false);
  });
});
