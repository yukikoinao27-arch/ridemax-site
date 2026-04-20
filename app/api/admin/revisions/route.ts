import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { listContentRevisions } from "@/lib/server/ridemax-content-repository";

/**
 * Revision history for the admin drawer. Metadata only — the full
 * content bundle is fetched during revert (POST /revisions/[id]/revert).
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const revisions = await listContentRevisions(20);
    return NextResponse.json({ revisions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load revisions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
