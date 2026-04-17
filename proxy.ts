import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Combined proxy — handles two concerns in priority order:
 *
 * 1. Hidden admin slug (analogous to WordPress's WPS Hide Login).
 *    When `ADMIN_PATH_SLUG` is set, `/admin` is only reachable via that
 *    secret slug or by visitors who already hold the `ridemax_admin` cookie.
 *    All other direct `/admin` hits return a 404.
 *
 * 2. Admin subdomain rewrite.
 *    Requests arriving on `admin.<domain>` are rewritten to `/admin` so
 *    the admin panel can be pinned to a dedicated hostname in production.
 *    In local dev, add `127.0.0.1 admin.localhost` to your hosts file.
 *
 * Both behaviors compose safely: the slug check runs first so the cookie
 * gate is always applied regardless of which entry point is used.
 */

const ADMIN_COOKIE_NAME = "ridemax_admin";
const ADMIN_PATH_PREFIX = "/admin";

function getAdminPathSlug(): string | null {
  const raw = process.env.ADMIN_PATH_SLUG?.trim();
  if (!raw) return null;
  const normalized = raw.replace(/^\/+/, "").replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : null;
}

function hasAdminSession(request: NextRequest): boolean {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return Boolean(cookie && cookie.length > 0);
}

function notFound(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/_ridemax_404";
  url.search = "";
  return NextResponse.rewrite(url, { status: 404 });
}

export function proxy(request: NextRequest) {
  const slug = getAdminPathSlug();
  const { pathname } = request.nextUrl;

  // ── 1. Hidden admin slug ──────────────────────────────────────────────────
  if (slug) {
    const slugEntry = `/${slug}`;

    // Secret slug → rewrite internally to /admin so the login form renders.
    if (pathname === slugEntry || pathname.startsWith(`${slugEntry}/`)) {
      const remainder = pathname.slice(slugEntry.length);
      const url = request.nextUrl.clone();
      url.pathname = `${ADMIN_PATH_PREFIX}${remainder}`;
      return NextResponse.rewrite(url);
    }

    // Direct /admin access only allowed if the visitor already has a session.
    if (pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)) {
      if (!hasAdminSession(request)) {
        return notFound(request);
      }
    }
  }

  // ── 2. Admin subdomain rewrite ────────────────────────────────────────────
  const host = request.headers.get("host") ?? "";
  const isAdminHost = host.toLowerCase().startsWith("admin.");

  if (isAdminHost) {
    const url = request.nextUrl.clone();
    if (!url.pathname.startsWith("/admin") && !url.pathname.startsWith("/api/admin")) {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|images/|assets/|api/).*)",
  ],
};
