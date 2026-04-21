import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { logAdminActivity } from "@/lib/server/admin-activity-log";
import {
  getAdminCookieName,
  getAdminIdentityCookieName,
  getExpectedAdminCookieValue,
  isAdminPasswordConfigured,
  isAdminPasswordMisconfigured,
  isValidAdminPassword,
} from "@/lib/server/admin-auth";

// Display-only identity captured so admin_activity_log rows can attribute an
// email instead of a generic "admin". Intentionally not validated beyond
// length+shape — this cookie does not grant access, it only labels actions.
function normalizeIdentity(raw: string): string {
  const trimmed = raw.trim().slice(0, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : "";
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, "admin-login", {
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.redirect(new URL("/admin?error=rate-limited", request.url));
  }

  if (isAdminPasswordMisconfigured() || !isAdminPasswordConfigured()) {
    return NextResponse.redirect(new URL("/admin?error=missing-admin-password", request.url));
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const email = normalizeIdentity(String(formData.get("email") ?? ""));

  if (!isValidAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin?error=invalid-password", request.url));
  }

  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set({
    name: getAdminCookieName(),
    value: getExpectedAdminCookieValue() ?? "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  if (email) {
    response.cookies.set({
      name: getAdminIdentityCookieName(),
      value: email,
      // Readable from server routes only — prevents trivial client tampering
      // via document.cookie.
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  await logAdminActivity({
    actorEmail: email || "admin",
    action: "login",
    entityType: null,
    entityId: null,
    metadata: null,
  });

  return response;
}
