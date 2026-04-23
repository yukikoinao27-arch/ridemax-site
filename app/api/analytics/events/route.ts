import { NextResponse } from "next/server";
import { z } from "zod";
import { recordSiteAnalyticsEvent } from "@/lib/server/site-analytics";

const analyticsEventSchema = z.object({
  kind: z.enum([
    "page_view",
    "cta_click",
    "brand_click",
    "product_click",
    "job_click",
    "search_submit",
  ]),
  path: z.string().min(1).max(240),
  label: z.string().max(160).optional(),
  href: z.string().max(240).optional(),
  surface: z.string().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

/**
 * Best-effort public analytics ingest.
 *
 * This route intentionally returns `204 No Content` for valid payloads and
 * swallows storage failures behind the repository module so the public site
 * never blocks navigation on analytics writes.
 */
export async function POST(request: Request) {
  const parsed = analyticsEventSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid analytics payload." },
      { status: 400 },
    );
  }

  await recordSiteAnalyticsEvent(parsed.data);
  return new NextResponse(null, { status: 204 });
}
