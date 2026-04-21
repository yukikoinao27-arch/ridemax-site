import { NextResponse } from "next/server";
import { jobApplicationInputSchema } from "@/lib/content-schemas";
import {
  hasFilledHoneypot,
  readTurnstileToken,
  verifyTurnstileToken,
} from "@/lib/server/contact-protection";
import { submitJobApplication } from "@/lib/server/job-applications";
import { consumeRateLimit } from "@/lib/server/rate-limit";

// Job applications use the same defense-in-depth stack as /api/contact:
// rate limit + honeypot + Turnstile. Marketing doesn't want to manually sift
// bot submissions out of the careers inbox.
export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, "careers-apply", {
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many applications in a short time. Please retry in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const body = await request.json().catch(() => null);

  // Silent success on honeypot trip so bots don't learn the field name by
  // watching status codes.
  if (hasFilledHoneypot(body)) {
    return NextResponse.json({ message: "Application received." });
  }

  const securityCheck = await verifyTurnstileToken(request, readTurnstileToken(body));
  if (!securityCheck.ok) {
    return NextResponse.json(
      { error: securityCheck.error ?? "Security check failed." },
      { status: 403 },
    );
  }

  const parsed = jobApplicationInputSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }

    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid application input.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await submitJobApplication(parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ message: "Application received." });
}
