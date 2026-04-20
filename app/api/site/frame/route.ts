import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  const content = await getSiteContent();

  return NextResponse.json({
    navigation: content.navigation,
    site: content.site,
    contact: content.contact,
  });
}
