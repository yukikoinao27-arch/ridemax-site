import { NextResponse } from "next/server";
import { externalProductCatalogSchema } from "@/lib/content-schemas";
import { getAdminIdentity, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { logAdminActivity } from "@/lib/server/admin-activity-log";
import { adminRateLimitResponse, consumeAdminWriteRateLimit } from "@/lib/server/admin-rate-limit";
import {
  getDraftProductCatalog,
  saveProductCatalog,
} from "@/lib/server/ridemax-content-repository";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getDraftProductCatalog());
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = consumeAdminWriteRateLimit(request, "catalog");
  if (!rateLimit.ok) {
    return adminRateLimitResponse(rateLimit.resetAt);
  }

  const body = await request.json();
  const parsed = externalProductCatalogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid catalog payload." },
      { status: 400 },
    );
  }

  try {
    await saveProductCatalog(parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save the product catalog.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await logAdminActivity({
    actorEmail: await getAdminIdentity(),
    action: "save_draft",
    entityType: "product_catalog",
    entityId: "primary",
    metadata: {
      categories: parsed.data.categories.length,
      items: parsed.data.items.length,
    },
  });

  return NextResponse.json({ message: "Catalog draft saved." });
}
