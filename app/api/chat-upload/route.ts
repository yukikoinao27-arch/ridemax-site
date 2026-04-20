import { NextResponse } from "next/server";
import { uploadImageAsset } from "@/lib/server/media-library";
import { consumeRateLimit } from "@/lib/server/rate-limit";

/**
 * Public chat upload endpoint used by the floating chat widget.
 *
 * Intentionally separate from `/api/upload` (admin-only media library) so
 * policy is obvious from the URL:
 *  - `/api/upload` is admin-only and persists to the CMS media library.
 *  - `/api/chat-upload` is anonymous visitor traffic, rate-limited, and
 *    the resulting URL is echoed straight back to the chat transcript.
 *
 * Hardening:
 *  - Payload size bound sourced from `RIDEMAX_CHAT_UPLOAD_MAX_MB`
 *    (defaults to 2 MB) so ops can tighten limits without a deploy.
 *  - Per-IP rate limit to keep anonymous traffic from filling a bucket.
 *  - Only image/jpeg, image/png, image/webp are accepted.
 *
 * This handler is a dispatcher over `uploadImageAsset`, which already knows
 * how to persist to Supabase Storage, S3, or the local disk depending on
 * env configuration (see lib/server/media-library.ts). Keeping this thin
 * means storage provider swaps don't touch the chat surface.
 */

const defaultMaxMb = 2;

function resolveMaxUploadBytes(): number {
  const raw = process.env.RIDEMAX_CHAT_UPLOAD_MAX_MB;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMaxMb;
  // Cap at 10 MB. Visitor uploads should stay small; anything larger is a
  // signal of misuse and is better rejected at the edge.
  return Math.min(mb, 10) * 1024 * 1024;
}

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const chatUploadRateLimit = {
  limit: 10,
  windowMs: 60_000,
};

export async function POST(request: Request) {
  const limit = consumeRateLimit(request, "chat-upload", chatUploadRateLimit);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const maxUploadBytes = resolveMaxUploadBytes();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  }

  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, and WebP images are allowed." },
      { status: 400 },
    );
  }

  if (file.size > maxUploadBytes) {
    const limitMb = Math.round(maxUploadBytes / (1024 * 1024));
    return NextResponse.json(
      { error: `Image too large. Max size is ${limitMb} MB.` },
      { status: 413 },
    );
  }

  try {
    const asset = await uploadImageAsset({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      contentType: file.type,
      // Chat uploads live under their own prefix so ops can apply a shorter
      // retention policy or a separate bucket without touching the CMS
      // media library.
      keyPrefix: "chat-uploads",
    });

    return NextResponse.json({
      url: asset.url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
