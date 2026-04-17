import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { isAdminAuthenticated, isAdminPasswordMisconfigured } from "@/lib/server/admin-auth";

/**
 * Shared admin chrome.
 *
 * Next.js re-uses the layout across sibling segments, so the sidebar and page
 * padding stay mounted when navigating from `/admin/pages` to `/admin/events`.
 * When the user is not authenticated, the layout falls through to `children`
 * bare, letting the individual page render its own sign-in UI (which depends
 * on searchParams that layouts do not receive).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const misconfigured = isAdminPasswordMisconfigured();
  const authenticated = await isAdminAuthenticated();
  const canRenderShell = !misconfigured && authenticated;

  if (!canRenderShell) {
    return <>{children}</>;
  }

  return (
    <main className="bg-[#f7f4f1] py-16">
      <div className="mx-auto max-w-[90rem] px-6 md:px-10">
        <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
          <AdminSidebar />
          <div className="space-y-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
