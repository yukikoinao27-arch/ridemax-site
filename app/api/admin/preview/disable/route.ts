import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearPreviewProductCatalog,
  clearPreviewSiteContent,
} from "@/lib/server/ridemax-content-repository";

export async function GET(request: Request) {
  const preview = await draftMode();
  preview.disable();
  await clearPreviewSiteContent();
  await clearPreviewProductCatalog();

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const destination = path && path.startsWith("/") ? path : "/admin";

  return NextResponse.redirect(new URL(destination, request.url));
}
