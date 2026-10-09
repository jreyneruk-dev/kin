/**
 * Validation helpers for person images. Pure functions (no DB, no DOM) so the
 * upload route and the client panel share the same limits and the unit tests
 * can exercise the sniffing without a browser.
 */

export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export type ImageMime = (typeof IMAGE_MIME_TYPES)[number];

/**
 * Server-side cap, comfortably under Vercel's ~4.5 MB request-body limit. The
 * upload form downscales in the browser so real uploads land far below this.
 */
export const MAX_IMAGE_BYTES = 4_000_000;

export const CAPTION_MAX = 200;
export const SOURCE_MAX = 200;

/** Identify an image from its magic bytes. */
export function sniffImageMime(data: Uint8Array): ImageMime | null {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (data.length >= 6) {
    const head = String.fromCharCode(...data.slice(0, 6));
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (
    data.length >= 12 &&
    String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Trim free text and cap it at a sensible length. */
export function cleanImageText(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

/** Human-readable size for the gallery UI ("214 KB"). */
export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
