import { NextResponse } from "next/server";
import { getAdminSearchIndex } from "@/lib/server/admin-search-index";
import { isAdminAuthenticated } from "@/lib/server/admin-auth";

/**
 * Search index for the admin command palette.
 *
 * Gated by `isAdminAuthenticated()` so the index (which includes unpublished
 * content) never leaks to the public. Returned as JSON because the palette
 * filters client-side; the result set is small enough (collections on a
 * marketing site, not a product DB) that shipping it once is cheaper than
 * a round-trip per keystroke.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ entries: [] }, { status: 401 });
  }

  const entries = await getAdminSearchIndex();
  return NextResponse.json({ entries });
}
