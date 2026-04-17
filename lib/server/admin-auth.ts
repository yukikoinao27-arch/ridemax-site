import { createHash } from "node:crypto";
import { cookies } from "next/headers";

const adminCookieName = "ridemax_admin";

function getPasswordHash(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function isAdminProtectionEnabled() {
  return Boolean(process.env.RIDEMAX_ADMIN_PASSWORD);
}

export function isAdminPasswordConfigured() {
  return typeof process.env.RIDEMAX_ADMIN_PASSWORD === "string" && process.env.RIDEMAX_ADMIN_PASSWORD.trim().length > 0;
}

/**
 * In production, admin access must be password-protected.
 * Missing password configuration is treated as a misconfiguration.
 */
export function isAdminPasswordMisconfigured() {
  return process.env.NODE_ENV === "production" && !isAdminPasswordConfigured();
}

export function getAdminCookieName() {
  return adminCookieName;
}

export function getExpectedAdminCookieValue() {
  const password = process.env.RIDEMAX_ADMIN_PASSWORD;
  return password ? getPasswordHash(password) : null;
}

export async function isAdminAuthenticated() {
  if (isAdminPasswordMisconfigured()) {
    return false;
  }

  if (!isAdminProtectionEnabled()) {
    return true;
  }

  const cookieStore = await cookies();
  const current = cookieStore.get(adminCookieName)?.value;
  return current === getExpectedAdminCookieValue();
}

export function isValidAdminPassword(password: string) {
  if (!isAdminPasswordConfigured()) {
    return false;
  }

  return password.length > 0 && password === process.env.RIDEMAX_ADMIN_PASSWORD;
}
