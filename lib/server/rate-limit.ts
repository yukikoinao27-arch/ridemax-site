type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

export function consumeRateLimit(
  request: Request,
  scope: string,
  policy: RateLimitPolicy,
) {
  const now = Date.now();
  const key = `${scope}:${getClientIp(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + policy.windowMs,
    });

    return {
      ok: true,
      remaining: policy.limit - 1,
      resetAt: now + policy.windowMs,
    };
  }

  if (current.count >= policy.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  buckets.set(key, current);

  return {
    ok: true,
    remaining: Math.max(policy.limit - current.count, 0),
    resetAt: current.resetAt,
  };
}
