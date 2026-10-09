import { NextResponse } from "next/server";
import { deleteImage, getPerson, imageBlob, logActivity } from "@/lib/db";
import { Unauthorized, unauthorizedResponse, requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/images/:id — serves the stored bytes to any signed-in session.
 * Same-origin <img> requests carry the session cookie, so the gallery needs no
 * special handling; anonymous requests get 401. Ids are never reused, so the
 * response may be cached privately forever.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const blob = await imageBlob(id);
    if (!blob) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Copy into a plain ArrayBuffer: clean typing for the Response body and no
    // shared-reference surprises.
    const body = new ArrayBuffer(blob.data.length);
    new Uint8Array(body).set(blob.data);
    return new Response(body, {
      headers: {
        "content-type": blob.mime,
        "content-length": String(blob.data.length),
        "cache-control": "private, max-age=31536000, immutable",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}

/** DELETE /api/images/:id — any signed-in member; logged in the activity feed. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const meta = await deleteImage(id);
    if (!meta) return NextResponse.json({ error: "not found" }, { status: 404 });

    const person = await getPerson(meta.personId);
    await logActivity(
      user.name,
      "deleted an image from",
      person?.fullName ?? `person ${meta.personId}`,
      meta.caption || null,
      Date.now(),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}
