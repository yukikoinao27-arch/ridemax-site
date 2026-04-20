import { NextResponse } from "next/server";
import { listPublishedEvents } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  const events = await listPublishedEvents();

  return NextResponse.json({
    total: events.length,
    events,
  });
}
