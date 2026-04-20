"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent admin navigation sidebar.
 *
 * Lives in `app/admin/layout.tsx` so it stays mounted across route
 * transitions instead of remounting inside each page shell. Previously this
 * was embedded in `AdminDashboard`, so every click caused a full server
 * round-trip that visibly flashed the nav, the source of the "blur on click"
 * feedback. Driving the active state from `usePathname()` instead of a prop
 * means the layout never has to re-render when the route changes.
 */

type AdminNavLink = {
  href: string;
  label: string;
  description: string;
};

type AdminNavAnchor = {
  href: string;
  label: string;
};

const routeLinks: AdminNavLink[] = [
  { href: "/admin", label: "Dashboard", description: "Status and inbox" },
  { href: "/admin/pages", label: "Pages", description: "Page builder and catalog pages" },
  { href: "/admin/events", label: "Stories", description: "News, events, awards" },
  { href: "/admin/promotions", label: "Promotions", description: "Video campaigns" },
  { href: "/admin/careers", label: "Careers", description: "Departments and jobs" },
  { href: "/admin/settings", label: "Settings", description: "Branding and contact data" },
];

const sectionAnchorsByHref: Record<string, AdminNavAnchor[]> = {
  "/admin": [{ href: "#inbox", label: "Inbox" }],
  "/admin/settings": [
    { href: "#settings-site", label: "Site Settings" },
    { href: "#settings-navigation", label: "Navigation" },
    { href: "#settings-social", label: "Social" },
  ],
  "/admin/pages": [
    { href: "#pages-builder", label: "Page Builder" },
    { href: "#pages-catalog", label: "Catalog" },
    { href: "#pages-brands", label: "Brands" },
  ],
  "/admin/events": [
    { href: "#content-news", label: "News" },
    { href: "#content-events", label: "Events" },
    { href: "#content-awards", label: "Awards" },
    { href: "#content-projects", label: "Highlights" },
  ],
  "/admin/promotions": [{ href: "#content-promotions", label: "Promotions" }],
  "/admin/careers": [
    { href: "#careers-departments", label: "Departments" },
    { href: "#careers-jobs", label: "Jobs" },
  ],
};

/**
 * Resolve the active nav entry from a pathname. Falls back to the dashboard
 * root so the sidebar always highlights something when the URL is an unknown
 * sub-route (e.g. a future detail page like `/admin/pages/home`).
 */
function resolveActiveHref(pathname: string | null): string {
  if (!pathname) {
    return "/admin";
  }

  const match = routeLinks
    .map((link) => link.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match ?? "/admin";
}

export function AdminSidebar() {
  const pathname = usePathname();
  const activeHref = resolveActiveHref(pathname);
  const anchors = sectionAnchorsByHref[activeHref] ?? [];

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <nav className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d120e]">CMS Navigation</p>
        {/*
         * Search button is the discoverable surface for the command palette.
         * Keyboard power users hit Ctrl+K; everyone else clicks here and
         * gets the same modal. The shortcut hint on the right mirrors the
         * visual language used in Linear, Vercel, and Sanity Studio.
         */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("admin-palette:open"))}
          className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-[#f7f2f1] px-3 py-2 text-left text-sm text-[#6a433d] transition hover:bg-[#efe7e5]"
        >
          <span>Search…</span>
          <span className="rounded-md border border-black/10 bg-white px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#7e5a53]">
            Ctrl K
          </span>
        </button>
        <div className="mt-4 flex flex-col gap-2">
          {routeLinks.map((link) => {
            const isActive = link.href === activeHref;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                prefetch
                className={`relative block rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-[#fcefee] pl-5 text-[#5d0d0a]"
                    : "cursor-pointer text-[#220707] hover:bg-[#f7f2f1]"
                }`}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-[#8d120e]"
                  />
                ) : null}
                <div className={`text-sm font-semibold ${isActive ? "text-[#5d0d0a]" : "text-[#220707]"}`}>
                  {link.label}
                </div>
                <div className={`mt-1 text-xs ${isActive ? "text-[#7a221d]" : "text-[#6a433d]"}`}>
                  {link.description}
                </div>
              </Link>
            );
          })}
        </div>

        {anchors.length > 0 ? (
          <div className="mt-6 border-t border-black/8 pt-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#7e5a53]">On This Page</p>
            <div className="mt-3 flex flex-col gap-1">
              {anchors.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  className="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-[#220707] transition hover:bg-[#f7f2f1]"
                >
                  {anchor.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/*
         * Sidebar footer. Logout lives here, not on the dashboard body,
         * so marketing can sign out from any admin route without scrolling
         * back to /admin. This matches the sidebar footer / avatar menu
         * convention used by WordPress, Ghost, Sanity, Strapi, and Contentful.
         */}
        <div className="mt-6 border-t border-black/8 pt-4">
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="block w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#220707] transition hover:bg-[#f7f2f1]"
            >
              Log Out
            </button>
          </form>
        </div>
      </nav>
    </aside>
  );
}
