import { NextResponse } from "next/server";
import { getAdminCookieName } from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin", request.url));
  response.cookies.set({
    name: getAdminCookieName(),
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}
