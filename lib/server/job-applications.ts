import { randomUUID } from "node:crypto";
import type { JobApplicationInput } from "@/lib/content-schemas";
import { getServerSupabaseClient } from "@/lib/server/supabase-server";

// Public shape returned to the admin inbox. `resumeUrl` is a free-text URL the
// applicant supplies (they host the file on Drive/Dropbox/etc). We intentionally
// don't accept binary uploads here — an unauthenticated file pipeline is a
// large class of security risk marketing shouldn't own.
export type JobApplication = {
  id: string;
  jobSlug: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  resumeUrl: string;
  archived: boolean;
  createdAt: string;
};

type JobApplicationRow = {
  id: string;
  job_slug: string;
  job_title: string;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  resume_url: string;
  archived: boolean;
  created_at: string;
};

function rowToApplication(row: JobApplicationRow): JobApplication {
  return {
    id: row.id,
    jobSlug: row.job_slug,
    jobTitle: row.job_title,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    resumeUrl: row.resume_url,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

type ApplicationsTable = {
  insert: (value: JobApplicationRow) => Promise<{ error: { message: string } | null }>;
  update: (value: { archived: boolean }) => {
    eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
  };
  select: (columns: string) => {
    eq: (
      column: string,
      value: boolean,
    ) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => Promise<{ data: JobApplicationRow[] | null; error: { message: string } | null }>;
    };
  };
};

// Applications default to the Supabase row when available; in local dev (no
// Supabase URL) we silently return empty / noop the writes. That matches the
// posture of lib/server/ridemax-content-repository.ts for other collections.
export async function submitJobApplication(input: JobApplicationInput): Promise<void> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return;

  const table = supabase.from("job_applications") as unknown as ApplicationsTable;
  const result = await table.insert({
    id: randomUUID(),
    job_slug: input.jobSlug,
    job_title: input.jobTitle,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    message: input.message,
    resume_url: input.resumeUrl,
    archived: false,
    created_at: new Date().toISOString(),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function listJobApplications(): Promise<JobApplication[]> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return [];

  const table = supabase.from("job_applications") as unknown as ApplicationsTable;
  const response = await table
    .select("id, job_slug, job_title, full_name, email, phone, message, resume_url, archived, created_at")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (response.error) {
    // Table may not exist yet (migration pending). Degrade to empty list so the
    // admin UI still renders instead of 500-ing.
    if (response.error.message.includes("job_applications")) {
      return [];
    }
    throw new Error(response.error.message);
  }

  return (response.data ?? []).map(rowToApplication);
}

export async function archiveJobApplication(id: string): Promise<void> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return;

  const table = supabase.from("job_applications") as unknown as ApplicationsTable;
  const result = await table.update({ archived: true }).eq("id", id);

  if (result.error) {
    throw new Error(result.error.message);
  }
}
