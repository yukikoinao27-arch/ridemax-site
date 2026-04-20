import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";
import { revertSiteContentToRevision } from "@/lib/server/ridemax-content-repository";

/**
 * Copy an old revision back into draft_content. The admin then reviews it
 * in preview and pushes Publish to make it live. Revert never bypasses the
 * publish step so the revision log stays coherent.
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const content = await revertSiteContentToRevision(id);
    return NextResponse.json({
      message: "Revision copied into draft. Preview and publish when ready.",
      content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revert.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
