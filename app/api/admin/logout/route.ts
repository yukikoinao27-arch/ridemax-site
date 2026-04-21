import { NextResponse } from "next/server";
import {
  getAdminCookieName,
  getAdminIdentityCookieName,
} from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url));
  for (const name of [getAdminCookieName(), getAdminIdentityCookieName()]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}
