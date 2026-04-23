import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { externalProductCatalogSchema, siteContentSchema } from "@/lib/content-schemas";
import { getAdminIdentity, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { logAdminActivity } from "@/lib/server/admin-activity-log";
import { adminRateLimitResponse, consumeAdminWriteRateLimit } from "@/lib/server/admin-rate-limit";
import {
  saveProductCatalog,
  saveSiteContent,
} from "@/lib/server/ridemax-content-repository";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = consumeAdminWriteRateLimit(request, "preview");
  if (!rateLimit.ok) {
    return adminRateLimitResponse(rateLimit.resetAt);
  }

  const body = (await request.json()) as {
    catalog?: unknown;
    content?: unknown;
    path?: string;
  };

  const parsed = siteContentSchema.safeParse(body.content);
  const parsedCatalog =
    body.catalog === undefined
      ? null
      : externalProductCatalogSchema.safeParse(body.catalog);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid preview payload." },
      { status: 400 },
    );
  }

  if (parsedCatalog && !parsedCatalog.success) {
    return NextResponse.json(
      { error: parsedCatalog.error.issues[0]?.message ?? "Invalid preview catalog payload." },
      { status: 400 },
    );
  }

  const destination = typeof body.path === "string" && body.path.startsWith("/")
    ? body.path
    : "/";

  try {
    await saveSiteContent(parsed.data, { allowLocalFallback: false });
    if (parsedCatalog?.success) {
      await saveProductCatalog(parsedCatalog.data, { allowLocalFallback: false });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const preview = await draftMode();
  preview.enable();

  await logAdminActivity({
    actorEmail: await getAdminIdentity(),
    action: "save_draft",
    entityType: "preview",
    entityId: destination,
    metadata: {
      path: destination,
      productCatalog: Boolean(parsedCatalog?.success),
    },
  });

  return NextResponse.json({
    previewUrl: new URL(destination, request.url).toString(),
  });
}
