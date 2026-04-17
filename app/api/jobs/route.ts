import { NextResponse } from "next/server";
import { listPublishedJobs } from "@/lib/server/ridemax-content-repository";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const department = url.searchParams.get("department") ?? undefined;
  const jobs = await listPublishedJobs(department);

  return NextResponse.json({ total: jobs.length, jobs });
}
