import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { uploadImageAsset } from "@/lib/server/media-library";
import { consumeRateLimit } from "@/lib/server/rate-limit";

/**
 * Admin media upload endpoint.
 *
 * Hardening vs. the previous implementation:
 *  - Maximum upload size is sourced from `RIDEMAX_UPLOAD_MAX_MB` so ops can
 *    tighten limits without a code deploy. It is also an authoritative gate:
 *    attackers can't pretend to be a 2 MB file once the infra quota is lower.
 *  - Per-IP rate limit sits on top of the admin cookie check so a leaked
 *    credential can't be used to fill disk or burn egress.
 */

const defaultMaxMb = 2;

function resolveMaxUploadBytes(): number {
  const raw = process.env.RIDEMAX_UPLOAD_MAX_MB;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const mb = Number.isFinite(parsed) && parsed > 0 ? parsed : defaultMaxMb;
  // Cap at 25 MB to keep memory bounded even when an admin over-sizes the env.
  return Math.min(mb, 25) * 1024 * 1024;
}

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const uploadRateLimit = {
  limit: 30,
  windowMs: 60_000,
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = consumeRateLimit(request, "admin-upload", uploadRateLimit);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Upload rate limit exceeded. Please wait a moment and try again." },
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
    });

    return NextResponse.json({
      message: "Image uploaded successfully.",
      url: asset.url,
      asset,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
