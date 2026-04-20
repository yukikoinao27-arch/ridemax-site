import { getClientIp } from "@/lib/server/rate-limit";

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasFilledHoneypot(body: unknown) {
  if (!isRecord(body)) {
    return false;
  }

  return typeof body.website === "string" && body.website.trim().length > 0;
}

export function readTurnstileToken(body: unknown) {
  if (!isRecord(body)) {
    return "";
  }

  const token = body.turnstileToken;
  return typeof token === "string" ? token.trim() : "";
}

/**
 * Verifies the optional Cloudflare Turnstile token for high-value lead forms.
 * If no secret is configured, the app keeps working in local/dev while the
 * honeypot and rate limit still absorb simple bots.
 */
export async function verifyTurnstileToken(request: Request, token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, error: "Complete the security check before sending." };
  }

  const formData = new FormData();
  formData.set("secret", secret);
  formData.set("response", token);

  const ip = getClientIp(request);
  if (ip && ip !== "unknown") {
    formData.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false, error: "Security check unavailable. Please try again." };
  }

  const result = (await response.json().catch(() => ({}))) as TurnstileVerifyResponse;
  return result.success
    ? { ok: true, skipped: false }
    : { ok: false, error: "Security check failed. Please try again." };
}
