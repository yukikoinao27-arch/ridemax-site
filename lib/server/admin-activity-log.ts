import { getServerSupabaseClient } from "@/lib/server/supabase-server";

// Actions are a closed vocabulary on purpose — downstream dashboards and
// queries depend on stable tokens. Adding a new one is a deliberate design
// decision, not a casual free-text write.
export type AdminAction =
  | "login"
  | "save_draft"
  | "publish"
  | "revert_revision"
  | "archive_message"
  | "archive_application"
  | "import_wix";

export type AdminActivityInput = {
  actorEmail: string;
  action: AdminAction;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ActivityLogTable = {
  insert: (value: {
    actor_email: string;
    action: AdminAction;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
  }) => Promise<{ error: { message: string } | null }>;
};

// The log is best-effort: a Supabase outage or missing table must never break
// a save/publish request. Callers invoke this after the primary write has
// succeeded, and we swallow any failure with a console warning so ops still
// sees it in Vercel logs without 500-ing the admin UI.
export async function logAdminActivity(entry: AdminActivityInput): Promise<void> {
  const supabase = getServerSupabaseClient();
  if (!supabase) return;

  const table = supabase.from("admin_activity_log") as unknown as ActivityLogTable;
  const result = await table.insert({
    actor_email: entry.actorEmail,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
  });

  if (result.error) {
    console.warn(
      `[admin-activity-log] failed to record ${entry.action} by ${entry.actorEmail}: ${result.error.message}`,
    );
  }
}
