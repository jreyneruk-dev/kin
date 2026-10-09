import { describe, expect, it } from "vitest";
import {
  CAPTION_MAX,
  MAX_IMAGE_BYTES,
  cleanImageText,
  humanBytes,
  sniffImageMime,
} from "../src/lib/images";

/** Well-known 1×1 transparent PNG. */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Minimal JPEG: SOI marker (FF D8 FF) is all the sniffer needs. */
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

const GIF_BYTES = Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.alloc(10, 0)]);

const WEBP_BYTES = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.alloc(4, 0),
  Buffer.from("WEBPVP8", "latin1"),
]);

describe("sniffImageMime", () => {
  it("recognises PNG, JPEG, GIF and WebP magic bytes", () => {
    expect(sniffImageMime(TINY_PNG)).toBe("image/png");
    expect(sniffImageMime(JPEG_BYTES)).toBe("image/jpeg");
    expect(sniffImageMime(GIF_BYTES)).toBe("image/gif");
    expect(sniffImageMime(WEBP_BYTES)).toBe("image/webp");
  });

  it("rejects non-image bytes — a renamed PDF or HTML file can't slip through", () => {
    expect(sniffImageMime(Buffer.from("%PDF-1.7 fake certificate"))).toBeNull();
    expect(sniffImageMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageMime(new Uint8Array(0))).toBeNull();
  });
});

describe("acceptance is sniff-only", () => {
  it("rejects opaque bytes even when the client claims an image type", () => {
    // Found live: a PDF renamed to .png with type=image/png must never store.
    const pdf = Buffer.from("%PDF-1.4 fake certificate");
    expect(sniffImageMime(pdf)).toBeNull();
  });

  it("accepts real image bytes regardless of the declared type", () => {
    expect(sniffImageMime(TINY_PNG)).toBe("image/png");
    expect(sniffImageMime(JPEG_BYTES)).toBe("image/jpeg");
  });
});

describe("cleanImageText", () => {
  it("trims whitespace", () => {
    expect(cleanImageText("  GRONI 1871 birth cert  ", CAPTION_MAX)).toBe("GRONI 1871 birth cert");
  });

  it("caps runaway text at the limit", () => {
    expect(cleanImageText("x".repeat(500), CAPTION_MAX)).toHaveLength(CAPTION_MAX);
  });

  it("treats missing values as empty strings", () => {
    expect(cleanImageText(null, CAPTION_MAX)).toBe("");
  });
});

describe("humanBytes", () => {
  it("formats bytes, KB and MB", () => {
    expect(humanBytes(512)).toBe("512 B");
    expect(humanBytes(219 * 1024)).toBe("219 KB");
    expect(humanBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("limits", () => {
  it("keeps the upload cap under Vercel's ~4.5 MB request-body limit", () => {
    expect(MAX_IMAGE_BYTES).toBeLessThan(4_500_000);
  });
});
