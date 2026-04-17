import { NextResponse } from "next/server";
import { contactMessageInputSchema } from "@/lib/content-schemas";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { submitContactMessage } from "@/lib/server/ridemax-content-repository";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, "contact", {
    limit: 10,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many contact requests. Please retry in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const body = await request.json();
  const parsed = contactMessageInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid contact form input." },
      { status: 400 },
    );
  }

  await submitContactMessage(parsed.data);

  return NextResponse.json({ message: "Your message has been sent to the admin panel." });
}
