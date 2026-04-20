import { createClient } from "@supabase/supabase-js";

export type ServerSupabaseClient = ReturnType<typeof createClient>;

type ServerSupabaseStatus =
  | {
      enabled: true;
      label: "Supabase";
      url: string;
      serviceRoleKey: string;
    }
  | {
      enabled: false;
      label: string;
      missing: "url" | "service-role-key";
    };

/**
 * Resolves the server-only Supabase configuration for repository and upload work.
 * Public publishable keys are intentionally excluded so partial deployment config
 * does not silently switch the app into an empty database mode.
 */
export function getServerSupabaseStatus(): ServerSupabaseStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim() ??
    "";

  if (!url) {
    return {
      enabled: false,
      label: "Local JSON (missing NEXT_PUBLIC_SUPABASE_URL)",
      missing: "url",
    };
  }

  if (!serviceRoleKey) {
    return {
      enabled: false,
      label: "Local JSON (missing SUPABASE_SERVICE_ROLE_KEY)",
      missing: "service-role-key",
    };
  }

  return {
    enabled: true,
    label: "Supabase",
    url,
    serviceRoleKey,
  };
}

/**
 * Creates the server-side Supabase client only when the deployment has the
 * required private credentials for trusted reads and writes.
 */
export function getServerSupabaseClient(): ServerSupabaseClient | null {
  const status = getServerSupabaseStatus();

  if (!status.enabled) {
    return null;
  }

  return createClient(status.url, status.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
