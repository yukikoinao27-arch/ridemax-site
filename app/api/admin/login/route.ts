import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import {
  getAdminCookieName,
  getExpectedAdminCookieValue,
  isAdminPasswordConfigured,
  isAdminPasswordMisconfigured,
  isValidAdminPassword,
} from "@/lib/server/admin-auth";

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

  return response;
}
