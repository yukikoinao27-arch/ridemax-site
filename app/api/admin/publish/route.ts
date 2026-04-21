import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminIdentity, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { logAdminActivity } from "@/lib/server/admin-activity-log";
import { publishSiteContent } from "@/lib/server/ridemax-content-repository";

/**
 * Publish the current draft bundle. Admins click the sticky "Publish"
 * button; the repository copies draft_content onto published_content,
 * appends an immutable revision, and stamps last_published_at.
 *
 * Cache revalidation is the same fan-out the legacy save endpoint uses.
 * Marketing expects the public site to refresh immediately on publish.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    note?: string;
  };

  const actor = await getAdminIdentity();
  try {
    await publishSiteContent({ actor, note: body.note ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await logAdminActivity({
    actorEmail: actor,
    action: "publish",
    entityType: "site_content",
    entityId: "primary",
    metadata: body.note ? { note: body.note } : null,
  });

  revalidatePath("/", "layout");
  revalidatePath("/search");
  revalidatePath("/products");
  revalidatePath("/careers");
  revalidatePath("/events");
  revalidatePath("/awards");
  revalidatePath("/promotions");

  return NextResponse.json({ message: "Published." });
}
