import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getServerSupabaseClient } from "@/lib/server/supabase-server";

export type SiteAnalyticsEventKind =
  | "page_view"
  | "cta_click"
  | "brand_click"
  | "product_click"
  | "job_click"
  | "search_submit";

export type SiteAnalyticsEventInput = {
  kind: SiteAnalyticsEventKind;
  path: string;
  label?: string | null;
  href?: string | null;
  surface?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type SiteAnalyticsEvent = SiteAnalyticsEventInput & {
  id: string;
  createdAt: string;
};

export type SiteAnalyticsSummary = {
  periodDays: number;
  totals: {
    pageViews: number;
    clickEvents: number;
    searchSubmits: number;
  };
  trackedSignals: Array<{
    label: string;
    description: string;
  }>;
  topPages: Array<{
    path: string;
    views: number;
  }>;
  topClicks: Array<{
    label: string;
    count: number;
    kind: SiteAnalyticsEventKind;
  }>;
  recentEvents: Array<{
    id: string;
    kind: SiteAnalyticsEventKind;
    label: string;
    path: string;
    createdAt: string;
  }>;
};

type AnalyticsLogTable = {
  insert: (value: {
    event_kind: SiteAnalyticsEventKind;
    path: string;
    label: string | null;
    href: string | null;
    surface: string | null;
    metadata: Record<string, unknown> | null;
  }) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    gte: (
      column: string,
      value: string,
    ) => {
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
                event_kind: SiteAnalyticsEventKind;
                path: string;
                label: string | null;
                href: string | null;
                surface: string | null;
                metadata: Record<string, unknown> | null;
                created_at: string;
              }>
            | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

const localAnalyticsPath = path.join(process.cwd(), "data", "site-analytics-events.json");
const LOCAL_EVENT_LIMIT = 5000;
const SUMMARY_EVENT_LIMIT = 3000;

function normalizePath(rawPath: string) {
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("/admin")) {
    return "";
  }

  return trimmed.slice(0, 240);
}

function normalizeText(value: string | null | undefined, maxLength: number) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function toEvent(row: {
  id: number | string;
  event_kind: SiteAnalyticsEventKind;
  path: string;
  label: string | null;
  href: string | null;
  surface: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): SiteAnalyticsEvent {
  return {
    id: String(row.id),
    kind: row.event_kind,
    path: row.path,
    label: row.label ?? null,
    href: row.href ?? null,
    surface: row.surface ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.created_at,
  };
}

async function readLocalEvents(): Promise<
  Array<{
    id: string;
    event_kind: SiteAnalyticsEventKind;
    path: string;
    label: string | null;
    href: string | null;
    surface: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>
> {
  try {
    const raw = await fs.readFile(localAnalyticsPath, "utf8");
    return JSON.parse(raw) as Array<{
      id: string;
      event_kind: SiteAnalyticsEventKind;
      path: string;
      label: string | null;
      href: string | null;
      surface: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }>;
  } catch {
    return [];
  }
}

async function appendLocalEvent(event: SiteAnalyticsEventInput) {
  const current = await readLocalEvents();
  const next = [
    {
      id: randomUUID(),
      event_kind: event.kind,
      path: event.path,
      label: event.label ?? null,
      href: event.href ?? null,
      surface: event.surface ?? null,
      metadata: event.metadata ?? null,
      created_at: new Date().toISOString(),
    },
    ...current,
  ].slice(0, LOCAL_EVENT_LIMIT);

  await fs.writeFile(localAnalyticsPath, JSON.stringify(next, null, 2));
}

function buildTopList(map: Map<string, { count: number; kind?: SiteAnalyticsEventKind }>, limit: number) {
  return [...map.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, limit)
    .map(([label, value]) => ({ label, count: value.count, kind: value.kind }));
}

function summarizeEvents(events: SiteAnalyticsEvent[], periodDays: number): SiteAnalyticsSummary {
  const pageCounts = new Map<string, number>();
  const clickCounts = new Map<string, { count: number; kind: SiteAnalyticsEventKind }>();
  let pageViews = 0;
  let clickEvents = 0;
  let searchSubmits = 0;

  for (const event of events) {
    if (event.kind === "page_view") {
      pageViews += 1;
      pageCounts.set(event.path, (pageCounts.get(event.path) ?? 0) + 1);
      continue;
    }

    if (event.kind === "search_submit") {
      searchSubmits += 1;
    } else {
      clickEvents += 1;
    }

    const clickLabel = event.label ?? event.href ?? event.path;
    clickCounts.set(clickLabel, {
      count: (clickCounts.get(clickLabel)?.count ?? 0) + 1,
      kind: event.kind,
    });
  }

  return {
    periodDays,
    totals: {
      pageViews,
      clickEvents,
      searchSubmits,
    },
    trackedSignals: [
      {
        label: "Page views",
        description: "One beacon per public page visit. Admin and preview routes are ignored.",
      },
      {
        label: "CTA and card clicks",
        description: "Hero buttons, brand cards, product cards, and job detail links only.",
      },
      {
        label: "Search submits",
        description: "Search opens are tracked without storing the raw query text.",
      },
    ],
    topPages: [...pageCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([path, views]) => ({ path, views })),
    topClicks: buildTopList(clickCounts, 5).map((item) => ({
      label: item.label,
      count: item.count,
      kind: item.kind ?? "cta_click",
    })),
    recentEvents: events.slice(0, 10).map((event) => ({
      id: event.id,
      kind: event.kind,
      label: event.label ?? event.href ?? event.path,
      path: event.path,
      createdAt: event.createdAt,
    })),
  };
}

/**
 * Best-effort event writer for lightweight product analytics.
 *
 * The public site uses small `sendBeacon` payloads so page navigation stays
 * fast. Missing analytics infrastructure must never break the page load, so
 * this writer quietly drops malformed/admin events and only logs backend
 * issues to the server console.
 */
export async function recordSiteAnalyticsEvent(input: SiteAnalyticsEventInput): Promise<void> {
  const path = normalizePath(input.path);
  if (!path) {
    return;
  }

  const event: SiteAnalyticsEventInput = {
    kind: input.kind,
    path,
    label: normalizeText(input.label, 160),
    href: normalizeText(input.href, 240),
    surface: normalizeText(input.surface, 80),
    metadata: input.metadata ?? null,
  };

  const supabase = getServerSupabaseClient();

  if (!supabase) {
    await appendLocalEvent(event);
    return;
  }

  const table = supabase.from("site_analytics_events") as unknown as AnalyticsLogTable;
  const result = await table.insert({
    event_kind: event.kind,
    path: event.path,
    label: event.label ?? null,
    href: event.href ?? null,
    surface: event.surface ?? null,
    metadata: event.metadata ?? null,
  });

  if (result.error) {
    console.warn(`[site-analytics] failed to record ${event.kind} on ${event.path}: ${result.error.message}`);
    await appendLocalEvent(event);
  }
}

async function readAnalyticsEventsSince(sinceIso: string): Promise<SiteAnalyticsEvent[]> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    const table = supabase.from("site_analytics_events") as unknown as AnalyticsLogTable;
    const result = await table
      .select("id, event_kind, path, label, href, surface, metadata, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(SUMMARY_EVENT_LIMIT);

    if (result.error) {
      console.warn(`[site-analytics] failed to read analytics events: ${result.error.message}`);
      return [];
    }

    return (result.data ?? []).map(toEvent);
  }

  const local = await readLocalEvents();
  return local
    .filter((row) => row.created_at >= sinceIso)
    .slice(0, SUMMARY_EVENT_LIMIT)
    .map(toEvent);
}

export async function getSiteAnalyticsSummary(periodDays = 7): Promise<SiteAnalyticsSummary> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const events = await readAnalyticsEventsSince(since);
  return summarizeEvents(events, periodDays);
}
