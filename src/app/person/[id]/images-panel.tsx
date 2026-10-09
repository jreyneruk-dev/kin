"use client";

import { useEffect, useState } from "react";
import type { PersonImage } from "@/lib/types";
import { humanBytes } from "@/lib/images";

/** Mirrors the server cap (lib/images.ts). */
const MAX_UPLOAD_BYTES = 4_000_000;
/** Longest edge after in-browser downscale — keeps registry screengrabs legible. */
const MAX_EDGE = 1600;

export type ImageItem = PersonImage;

/**
 * Downscale in the browser before upload: keeps uploads far under Vercel's
 * ~4.5 MB body limit and makes thumbnails cheap. Returns the original file
 * when it's already small or can't be decoded. Throws a user-facing message
 * when nothing usable comes out.
 */
export async function prepareUpload(file: File): Promise<Blob> {
  let decoded: ImageBitmap | null = null;
  try {
    decoded = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    decoded = null; // not decodable — fall through to the raw-bytes path
  }

  if (decoded) {
    try {
      const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));
      if (scale < 1 || file.size > 1_500_000) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(decoded.width * scale));
        canvas.height = Math.max(1, Math.round(decoded.height * scale));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(decoded, 0, 0, canvas.width, canvas.height);
          const type = file.type === "image/png" ? "image/png" : "image/jpeg";
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, type, 0.85),
          );
          if (blob && blob.size < file.size) {
            if (blob.size <= MAX_UPLOAD_BYTES) return blob;
            // Still too big (huge PNG screengrab): last resort, harder JPEG.
            const smaller = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/jpeg", 0.7),
            );
            if (smaller && smaller.size <= MAX_UPLOAD_BYTES) return smaller;
            throw new Error("that image is too large — crop it or take a smaller screengrab");
          }
        }
      }
    } finally {
      decoded.close();
    }
  }

  if (file.size <= MAX_UPLOAD_BYTES) return file;
  throw new Error("that image is too large — crop it or take a smaller screengrab");
}

export function ImagesPanel({
  personId,
  personName,
  initial,
}: {
  personId: number;
  personName: string;
  initial: ImageItem[];
}) {
  const [images, setImages] = useState(initial);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ImageItem | null>(null);

  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("choose an image first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await prepareUpload(file);
      const fd = new FormData();
      const name = file.name.replace(/\.[^.]+$/, "") || "image";
      const type = blob.type || file.type || "image/jpeg";
      fd.append("file", new File([blob], `${name}.${type === "image/png" ? "png" : "jpg"}`, { type }));
      fd.append("caption", caption);
      fd.append("source", source);
      const bitmap = await createImageBitmap(blob).catch(() => null);
      if (bitmap) {
        fd.append("width", String(bitmap.width));
        fd.append("height", String(bitmap.height));
        bitmap.close();
      }
      const res = await fetch(`/api/people/${personId}/images`, { method: "POST", body: fd });
      if (res.ok) {
        const data = (await res.json()) as { image: ImageItem };
        setImages((prev) => [...prev, data.image]);
        setOpen(false);
        setFile(null);
        setCaption("");
        setSource("");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(img: ImageItem) {
    if (!window.confirm(`Delete this image${img.caption ? ` (“${img.caption}”)` : ""}?`)) return;
    const res = await fetch(`/api/images/${img.id}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      setViewing(null);
    } else {
      setError("delete failed — try again");
    }
  }

  return (
    <div className="mt-4">
      {images.length === 0 && !open && (
        <p className="text-sm italic text-stone-500">
          No images yet — certificates, registry screengrabs and photos all live here.
        </p>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setViewing(img)}
                className="block w-full text-left"
                title={img.caption || "view image"}
              >
                <img
                  src={`/api/images/${img.id}`}
                  alt={img.caption || `Image of ${personName}`}
                  loading="lazy"
                  className="h-40 w-full rounded-lg border border-stone-200 bg-stone-50 object-contain p-1 hover:border-kin"
                />
                {img.caption && (
                  <p className="mt-1 truncate text-xs font-semibold text-stone-600">{img.caption}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form className="mt-4 space-y-3 rounded-lg bg-stone-50 p-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-stone-800">
            Image
            <input
              required
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm font-normal text-stone-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-kin file:px-3 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-kin-dark"
            />
            <span className="mt-1 block font-normal text-stone-500">
              PNG, JPEG, WebP or GIF — big photos are shrunk automatically before upload.
            </span>
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Caption
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Birth certificate, GRONI 1871"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Source <span className="font-normal text-stone-500">(where it came from)</span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. geni.nidirect.gov.uk, ordered 2026"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal"
            />
          </label>
          {error && <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-kin px-4 py-2 text-sm font-bold text-white hover:bg-kin-dark disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Upload image"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-kin hover:text-kin-dark"
        >
          + Add an image
        </button>
      )}

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={viewing.caption || "Image viewer"}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
          onClick={() => setViewing(null)}
        >
          <img
            src={`/api/images/${viewing.id}`}
            alt={viewing.caption || `Image of ${personName}`}
            className="max-h-[80vh] max-w-full rounded-lg bg-white object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm text-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-semibold">{viewing.caption || "Untitled image"}</span>
            <span className="text-stone-400">
              {viewing.mime.replace("image/", "").toUpperCase()} · {humanBytes(viewing.bytes)}
            </span>
            {viewing.source && <span className="italic text-stone-400">{viewing.source}</span>}
            <span className="text-stone-500">added by {viewing.addedBy}</span>
            <button
              type="button"
              onClick={() => remove(viewing)}
              className="rounded border border-rose-400/60 px-2 py-0.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="rounded border border-stone-500 px-2 py-0.5 text-xs font-semibold text-stone-300 hover:bg-white/10"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
