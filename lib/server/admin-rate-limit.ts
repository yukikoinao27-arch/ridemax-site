import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/server/rate-limit";

const adminWriteRateLimit = {
  limit: 80,
  windowMs: 60_000,
};

/**
 * Applies one shared throttle to authenticated admin mutations. The admin UI
 * batches most edits into Save Draft / Publish, so this limit catches loops
 * and abuse without blocking normal marketing sessions.
 */
export function consumeAdminWriteRateLimit(request: Request, scope: string) {
  return consumeRateLimit(request, `admin-${scope}`, adminWriteRateLimit);
}

export function adminRateLimitResponse(resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return NextResponse.json(
    { error: "Too many admin actions. Please wait a minute and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
