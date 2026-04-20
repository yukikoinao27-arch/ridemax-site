import { NextResponse } from "next/server";
import { getAdminMetrics } from "@/lib/server/ridemax-content-repository";

export async function GET() {
  return NextResponse.json(await getAdminMetrics());
}
