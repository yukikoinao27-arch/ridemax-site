import { NextResponse } from "next/server";
import { listPublishedPromotions } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  const promotions = await listPublishedPromotions();

  return NextResponse.json({
    total: promotions.length,
    promotions,
  });
}
