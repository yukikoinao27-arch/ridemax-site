import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { searchSite } from "@/lib/server/ridemax-content-repository";

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(request, "search", {
    limit: 100,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many search requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").slice(0, 120);
  const results = await searchSite(query);

  return NextResponse.json({
    query,
    total: results.length,
    results,
  });
}
