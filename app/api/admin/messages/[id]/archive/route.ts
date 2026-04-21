import { NextResponse } from "next/server";
import { getAdminIdentity, isAdminAuthenticated } from "@/lib/server/admin-auth";
import { logAdminActivity } from "@/lib/server/admin-activity-log";
import { archiveContactMessage } from "@/lib/server/ridemax-content-repository";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const messageId = id.trim();

  if (!messageId) {
    return NextResponse.json({ error: "Missing message id." }, { status: 400 });
  }

  await archiveContactMessage(messageId);

  await logAdminActivity({
    actorEmail: await getAdminIdentity(),
    action: "archive_message",
    entityType: "contact_message",
    entityId: messageId,
    metadata: null,
  });

  return NextResponse.json({ message: "Message archived." });
}
