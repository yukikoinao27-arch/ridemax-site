import { NextResponse } from "next/server";
import { getAdminIdentity, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { logAdminActivity } from "@/lib/server/admin-activity-log";
import { adminRateLimitResponse, consumeAdminWriteRateLimit } from "@/lib/server/admin-rate-limit";
import { archiveJobApplication } from "@/lib/server/job-applications";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = consumeAdminWriteRateLimit(request, "archive");
  if (!rateLimit.ok) {
    return adminRateLimitResponse(rateLimit.resetAt);
  }

  const { id } = await context.params;
  const applicationId = id.trim();
  if (!applicationId) {
    return NextResponse.json({ error: "Missing application id." }, { status: 400 });
  }

  try {
    await archiveJobApplication(applicationId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await logAdminActivity({
    actorEmail: await getAdminIdentity(),
    action: "archive_application",
    entityType: "job_application",
    entityId: applicationId,
    metadata: null,
  });

  return NextResponse.json({ message: "Application archived." });
}
