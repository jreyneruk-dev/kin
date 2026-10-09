import { NextResponse } from "next/server";
import { getPerson, insertImage, logActivity } from "@/lib/db";
import {
  CAPTION_MAX,
  MAX_IMAGE_BYTES,
  SOURCE_MAX,
  cleanImageText,
  humanBytes,
  sniffImageMime,
} from "@/lib/images";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function positiveInt(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 20_000 ? n : null;
}

/**
 * POST /api/people/:id/images — multipart upload (file, caption, source,
 * width, height). Any signed-in member can contribute; the activity log
 * records who added what.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const personId = Number(idStr);
    if (!Number.isInteger(personId)) {
      return NextResponse.json({ error: "bad id" }, { status: 400 });
    }
    const person = await getPerson(personId);
    if (!person) return NextResponse.json({ error: "person not found" }, { status: 404 });

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "expected a multipart form upload" }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no image file received" }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "the file is empty" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          error: `that image is ${humanBytes(file.size)} — the limit is ${humanBytes(MAX_IMAGE_BYTES)}. The page downscales automatically, so a screenshot pasted at full size should still fit; try cropping it.`,
        },
        { status: 413 },
      );
    }

    const data = Buffer.from(await file.arrayBuffer());
    // Magic bytes decide, full stop — a declared type ("image/png" from a
    // renamed PDF, via curl or a buggy client) is never trusted.
    const mime = sniffImageMime(data);
    if (!mime) {
      return NextResponse.json(
        { error: "only PNG, JPEG, WebP or GIF images are accepted" },
        { status: 415 },
      );
    }

    const now = Date.now();
    const image = await insertImage(
      {
        personId,
        mime,
        bytes: data.length,
        width: positiveInt(form.get("width")),
        height: positiveInt(form.get("height")),
        caption: cleanImageText(form.get("caption"), CAPTION_MAX),
        source: cleanImageText(form.get("source"), SOURCE_MAX),
        addedBy: user.email,
      },
      data,
      now,
    );
    await logActivity(
      user.name,
      "added an image to",
      person.fullName,
      image.caption || `${mime}, ${humanBytes(image.bytes)}`,
      now,
    );
    return NextResponse.json({ ok: true, image });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
