import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
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

export type AdminActivityEntry = {
  id: string;
  actorEmail: string;
  action: AdminAction;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type ActivityLogTable = {
  insert: (value: {
    actor_email: string;
    action: AdminAction;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
  }) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    order: (
      column: string,
      options: { ascending: boolean },
    ) => {
      limit: (
        count: number,
      ) => Promise<{
        data:
          | Array<{
              id: number | string;
              actor_email: string;
              action: AdminAction;
              entity_type: string | null;
              entity_id: string | null;
              metadata: Record<string, unknown> | null;
              created_at: string;
            }>
          | null;
        error: { message: string } | null;
      }>;
    };
  };
};

const localAdminActivityPath = path.join(process.cwd(), "data", "admin-activity-log.json");
const LOCAL_ACTIVITY_LIMIT = 200;

function toActivityEntry(row: {
  id: number | string;
  actor_email: string;
  action: AdminAction;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): AdminActivityEntry {
  return {
    id: String(row.id),
    actorEmail: row.actor_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? null,
    createdAt: row.created_at,
  };
}

async function readLocalActivityLog() {
  try {
    const raw = await fs.readFile(localAdminActivityPath, "utf8");
    return JSON.parse(raw) as Array<{
      id: string;
      actor_email: string;
      action: AdminAction;
      entity_type: string | null;
      entity_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>;
  } catch {
    return [];
  }
}

async function appendLocalActivity(entry: AdminActivityInput) {
  const current = await readLocalActivityLog();
  const next = [
    {
      id: randomUUID(),
      actor_email: entry.actorEmail,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      created_at: new Date().toISOString(),
    },
    ...current,
  ].slice(0, LOCAL_ACTIVITY_LIMIT);

  await fs.writeFile(localAdminActivityPath, JSON.stringify(next, null, 2));
}

// The log is best-effort: a Supabase outage or missing table must never break
// a save/publish request. Callers invoke this after the primary write has
// succeeded, and we swallow any failure with a console warning so ops still
// sees it in Vercel logs without 500-ing the admin UI.
export async function logAdminActivity(entry: AdminActivityInput): Promise<void> {
  const supabase = getServerSupabaseClient();
  if (!supabase) {
    await appendLocalActivity(entry);
    return;
  }

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
    await appendLocalActivity(entry);
  }
}

export async function listAdminActivity(limit = 12): Promise<AdminActivityEntry[]> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    const table = supabase.from("admin_activity_log") as unknown as ActivityLogTable;
    const result = await table
      .select("id, actor_email, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (result.error) {
      console.warn(`[admin-activity-log] failed to read activity log: ${result.error.message}`);
      return [];
    }

    return (result.data ?? []).map(toActivityEntry);
  }

  const local = await readLocalActivityLog();
  return local.slice(0, limit).map(toActivityEntry);
}
