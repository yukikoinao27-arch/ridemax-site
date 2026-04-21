import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { draftMode } from "next/headers";
import type {
  AwardItem,
  BrandFeature,
  ContactMessage,
  ContactMessageInput,
  ContentPageSlug,
  EventItem,
  ExternalProductCatalog,
  JobOpening,
  NewsItem,
  PageDocument,
  ProductCategory,
  ProjectFeature,
  PromotionItem,
  RidemaxSiteContent,
  SearchRecord,
} from "@/lib/ridemax-types";
import {
  contactMessageInputSchema,
  externalProductCatalogSchema,
  siteContentSchema,
} from "@/lib/content-schemas";
import { getServerSupabaseClient, getServerSupabaseStatus } from "@/lib/server/supabase-server";

const siteContentPath = path.join(process.cwd(), "data", "site-content.json");
const draftSiteContentPath = path.join(process.cwd(), "data", "site-content.draft.json");
const previewSiteContentPath = path.join(process.cwd(), "data", "preview-site-content.json");
const siteContentRevisionsPath = path.join(process.cwd(), "data", "site-content-revisions.json");
const contactMessagesPath = path.join(process.cwd(), "data", "contact-messages.json");
const catalogProductsPath = path.join(process.cwd(), "data", "catalog-products.json");
const primaryContentSlug = "primary";
const REVISION_LIMIT = 50;

/**
 * A single snapshot of the published content bundle. Revisions are written
 * exclusively by {@link publishSiteContent}; the list is how admins recover
 * from a bad publish.
 */
export type SiteContentRevision = {
  id: string;
  slug: string;
  createdAt: string;
  createdBy: string | null;
  note: string | null;
};

type ContentDocumentUpsert = {
  slug: string;
  content?: RidemaxSiteContent;
  draft_content?: RidemaxSiteContent | null;
  published_content?: RidemaxSiteContent | null;
  last_published_at?: string | null;
};

type ContentDocumentTable = {
  upsert: (
    value: ContentDocumentUpsert,
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => {
      maybeSingle: () => Promise<{
        data: {
          content?: unknown;
          draft_content?: unknown;
          published_content?: unknown;
          last_published_at?: string | null;
        } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

type RevisionRow = {
  id: number | string;
  slug: string;
  created_at: string;
  created_by: string | null;
  note: string | null;
  content?: unknown;
};

type RevisionsTable = {
  insert: (value: {
    slug: string;
    content: RidemaxSiteContent;
    note: string | null;
    created_by: string | null;
  }) => Promise<{ error: { message: string } | null }>;
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => {
      order: (
        column: string,
        options: { ascending: boolean },
      ) => {
        limit: (
          count: number,
        ) => Promise<{ data: RevisionRow[] | null; error: { message: string } | null }>;
      };
    };
  };
};

type RevisionContentQuery = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: number,
    ) => {
      maybeSingle: () => Promise<{
        data: (RevisionRow & { content?: unknown }) | null;
        error: { message: string } | null;
      }>;
    };
  };
};

type ContactMessageRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  archived?: boolean;
  created_at: string;
};

type ContactMessagesTable = {
  select: (columns: string) => {
    order: (
      column: string,
      options: { ascending: boolean },
    ) => Promise<{ data: ContactMessageRow[] | null; error: { message: string } | null }>;
  };
  insert: (value: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    message: string;
    archived: boolean;
    created_at: string;
  }) => Promise<unknown>;
  update: (value: { archived: boolean }) => {
    eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
  };
};

function isDraftPublishMigrationError(message: string) {
  return (
    message.includes("draft_content") ||
    message.includes("published_content") ||
    message.includes("last_published_at") ||
    message.includes("site_content_revisions")
  );
}

// First-ever draft save fails the NOT NULL check on `content` because the
// row doesn't exist yet. Detect that so we can seed the column.
function isContentNotNullError(message: string) {
  return (
    message.includes("null value") &&
    message.includes('"content"') &&
    message.includes("site_content_documents")
  );
}

function draftPublishMigrationMessage(message: string) {
  return [
    "Supabase is missing the CMS draft/publish migration.",
    "Run the idempotent migration block in supabase/schema.sql for site_content_documents and site_content_revisions, then retry Publish.",
    `Original database error: ${message}`,
  ].join(" ");
}

function throwSupabaseError(message: string): never {
  throw new Error(
    isDraftPublishMigrationError(message)
      ? draftPublishMigrationMessage(message)
      : message,
  );
}

function sortByOrder<T extends { order: number }>(items: ReadonlyArray<T>) {
  return [...items].sort((left, right) => left.order - right.order);
}

function sortPublishedByOrder<T extends { order: number; published: boolean }>(items: ReadonlyArray<T>) {
  return sortByOrder(items.filter((item) => item.published));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9+]+/i)
    .filter(Boolean);
}

function pageHref(slug: ContentPageSlug) {
  switch (slug) {
    case "home":
      return "/";
    case "events-awards":
      return "/events-awards";
    default:
      return `/${slug}`;
  }
}

function getConfiguredStorageLabel() {
  return getServerSupabaseStatus().label;
}

async function readJsonFile<T>(targetPath: string) {
  const file = await fs.readFile(targetPath, "utf8");
  return JSON.parse(file) as T;
}

async function writeJsonFile(targetPath: string, value: unknown) {
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizePage(page: PageDocument): PageDocument {
  return {
    ...page,
    blocks: [...page.blocks].sort((left, right) => left.order - right.order),
  };
}

function normalizeSiteContent(content: RidemaxSiteContent) {
  return {
    ...content,
    pages: content.pages.map(normalizePage),
    brands: sortByOrder(content.brands),
    promotions: sortByOrder(content.promotions),
    departments: sortByOrder(content.departments),
    jobs: sortByOrder(content.jobs),
    newsItems: sortByOrder(content.newsItems),
    events: sortByOrder(content.events),
    awards: sortByOrder(content.awards),
    projectFeatures: sortByOrder(content.projectFeatures),
  } satisfies RidemaxSiteContent;
}

function normalizeCatalog(catalog: ExternalProductCatalog) {
  return {
    ...catalog,
    items: sortByOrder(catalog.items),
  } satisfies ExternalProductCatalog;
}

async function readLocalSiteContent() {
  const raw = await readJsonFile<unknown>(siteContentPath);
  return normalizeSiteContent(siteContentSchema.parse(raw));
}

async function readPreviewSiteContent() {
  const raw = await readJsonFile<unknown>(previewSiteContentPath);
  return normalizeSiteContent(siteContentSchema.parse(raw));
}

async function readLocalCatalog() {
  const raw = await readJsonFile<unknown>(catalogProductsPath);
  return normalizeCatalog(externalProductCatalogSchema.parse(raw));
}

async function readLocalMessages() {
  return readJsonFile<ContactMessage[]>(contactMessagesPath);
}

/**
 * Read one or both of the draft/published columns from Supabase.
 *
 * `mode` picks which column the public getter prefers. `draft` readers fall
 * back to published_content and then the legacy `content` column so a Draft
 * Mode request does not 500 before the first draft is saved. `published`
 * readers fall back to `content` so historical rows rendered pre-migration
 * continue to work.
 */
async function readSupabaseSiteContent(mode: "draft" | "published") {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const contentTable = supabase.from("site_content_documents") as unknown as ContentDocumentTable;
  let response = await contentTable
    .select("content, draft_content, published_content")
    .eq("slug", primaryContentSlug)
    .maybeSingle();

  // Graceful degradation: if the draft/publish migration hasn't been applied yet,
  // re-query with only the legacy column so reads keep working without a migration gate.
  if (response.error && isDraftPublishMigrationError(response.error.message)) {
    response = await contentTable
      .select("content")
      .eq("slug", primaryContentSlug)
      .maybeSingle() as typeof response;
  }

  const { data, error } = response;

  if (error) {
    throwSupabaseError(error.message);
  }

  if (!data) {
    return null;
  }

  const candidates =
    mode === "draft"
      ? [data.draft_content, data.published_content, data.content]
      : [data.published_content, data.content];

  for (const candidate of candidates) {
    if (candidate) {
      return normalizeSiteContent(siteContentSchema.parse(candidate));
    }
  }

  return null;
}

/**
 * Write the draft bundle. The legacy `content` column is left untouched so
 * pre-migration readers keep seeing the last published version until the
 * next publish.
 *
 * If the draft/publish migration hasn't been applied yet (draft_content column
 * missing) we fall back to writing the legacy `content` column so saves work
 * even on an unmigrated database.
 */
async function writeSupabaseDraftContent(content: RidemaxSiteContent) {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return false;
  }

  const contentTable = supabase.from("site_content_documents") as unknown as ContentDocumentTable;
  const { error } = await contentTable.upsert(
    {
      slug: primaryContentSlug,
      draft_content: content,
    },
    {
      onConflict: "slug",
    },
  );

  if (error) {
    if (isContentNotNullError(error.message)) {
      // No row exists yet for this slug. Seed `content` with the draft so the
      // NOT NULL constraint is satisfied; subsequent draft saves will land in
      // the UPDATE branch and leave the published column untouched.
      const seed = await contentTable.upsert(
        { slug: primaryContentSlug, content, draft_content: content },
        { onConflict: "slug" },
      );
      if (seed.error) throwSupabaseError(seed.error.message);
      return true;
    }
    if (isDraftPublishMigrationError(error.message)) {
      // Migration not yet applied — write to the legacy content column so
      // saves are not blocked until the admin runs the schema migration.
      const fallback = await contentTable.upsert(
        { slug: primaryContentSlug, content },
        { onConflict: "slug" },
      );
      if (fallback.error) throwSupabaseError(fallback.error.message);
      return true;
    }
    throwSupabaseError(error.message);
  }

  return true;
}

/**
 * Publish the current draft: copy draft_content to published_content, mirror
 * it into the legacy `content` column, stamp last_published_at, and append
 * an immutable revision. Clears the draft so the sticky save bar in admin
 * stops showing "unsaved draft" right after a publish.
 */
async function writeSupabasePublishedContent(
  content: RidemaxSiteContent,
  actor: string | null,
  note: string | null,
) {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return false;
  }

  const publishedAt = new Date().toISOString();

  const contentTable = supabase.from("site_content_documents") as unknown as ContentDocumentTable;
  const upsertResult = await contentTable.upsert(
    {
      slug: primaryContentSlug,
      content,
      published_content: content,
      draft_content: null,
      last_published_at: publishedAt,
    },
    {
      onConflict: "slug",
    },
  );

  if (upsertResult.error) {
    if (isDraftPublishMigrationError(upsertResult.error.message)) {
      // Migration not yet applied on this Supabase instance — keep publish
      // working by writing only the legacy `content` column. The revisions
      // table may still be missing, handled a few lines below.
      const fallback = await contentTable.upsert(
        { slug: primaryContentSlug, content },
        { onConflict: "slug" },
      );
      if (fallback.error) throwSupabaseError(fallback.error.message);
    } else {
      throwSupabaseError(upsertResult.error.message);
    }
  }

  const revisionsTable = supabase.from("site_content_revisions") as unknown as RevisionsTable;
  const insertResult = await revisionsTable.insert({
    slug: primaryContentSlug,
    content,
    note,
    created_by: actor,
  });

  if (insertResult.error) {
    if (isDraftPublishMigrationError(insertResult.error.message)) {
      // Revisions table missing — publish still succeeded on the primary row,
      // so surface a soft warning via console rather than failing the request.
      console.warn(
        "[cms] Publish succeeded but revision not recorded — run supabase/schema.sql to create site_content_revisions.",
      );
      return true;
    }
    throwSupabaseError(insertResult.error.message);
  }

  return true;
}

async function fetchRemoteCatalog(
  content: Pick<RidemaxSiteContent, "catalogSource">,
) {
  if (content.catalogSource.mode !== "remote-api" || !content.catalogSource.endpoint.trim()) {
    return null;
  }

  const headers: HeadersInit = {
    Accept: "application/json",
  };
  const apiKey = process.env.RIDEMAX_PRODUCTS_API_KEY?.trim();

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(content.catalogSource.endpoint, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`External catalog request failed: ${response.status}`);
  }

  const payload = await response.json();
  const parsed = externalProductCatalogSchema.parse(payload);

  return normalizeCatalog({
    ...parsed,
    source: {
      ...parsed.source,
      ...content.catalogSource,
      lastSyncedAt: new Date().toISOString(),
    },
  });
}

/**
 * Read the live content bundle. Public pages call this without arguments;
 * Draft Mode flips them over to the in-progress draft so marketing can
 * preview unpublished changes using the real site shell.
 *
 * Fallback chain (deep module: callers never see the layers):
 *   1. Supabase draft/published column, based on Draft Mode
 *   2. Legacy `preview-site-content.json` for local dev preview
 *   3. Local draft file (for Draft Mode)
 *   4. Local published file `site-content.json`
 */
export async function getSiteContent(): Promise<RidemaxSiteContent> {
  noStore();
  const preview = await draftMode();
  const mode = preview.isEnabled ? "draft" : "published";

  try {
    const supabaseContent = await readSupabaseSiteContent(mode);

    if (supabaseContent) {
      return supabaseContent;
    }
  } catch {
    // The EC2 path prefers the local bundle when Supabase is missing or not seeded.
  }

  if (preview.isEnabled) {
    try {
      return await readPreviewSiteContent();
    } catch {
      // Preview mode is best-effort; fall through to the persisted content.
    }
    try {
      return normalizeSiteContent(
        siteContentSchema.parse(await readJsonFile<unknown>(draftSiteContentPath)),
      );
    } catch {
      // No local draft yet. Fall through to the published local file.
    }
  }

  return readLocalSiteContent();
}

/**
 * Read the staged editor bundle for authenticated admin screens. Unlike
 * public reads, this always prefers the persisted draft so a refresh does not
 * hide work that marketing saved but has not published yet.
 */
export async function getDraftSiteContent(): Promise<RidemaxSiteContent> {
  noStore();

  try {
    const supabaseContent = await readSupabaseSiteContent("draft");

    if (supabaseContent) {
      return supabaseContent;
    }
  } catch {
    // The EC2 path prefers the local bundle when Supabase is missing or not seeded.
  }

  try {
    return normalizeSiteContent(
      siteContentSchema.parse(await readJsonFile<unknown>(draftSiteContentPath)),
    );
  } catch {
    return readLocalSiteContent();
  }
}

/**
 * Save a draft. This is what the sticky "Save" bar in admin writes to.
 * Public pages are unaffected until {@link publishSiteContent} runs.
 */
export async function saveSiteContent(content: RidemaxSiteContent) {
  const parsed = normalizeSiteContent(siteContentSchema.parse(content));

  if (await writeSupabaseDraftContent(parsed)) {
    return;
  }

  await writeJsonFile(draftSiteContentPath, parsed);
}

/**
 * Publish the current draft. When no draft is staged we publish the live
 * content again. Harmless on Supabase, and useful as a "reseed" lever on
 * the local JSON path. Appends a revision entry so admins can roll back.
 */
export async function publishSiteContent(options?: { actor?: string | null; note?: string | null }) {
  const actor = options?.actor ?? null;
  const note = options?.note ?? null;

  const supabase = getServerSupabaseClient();

  if (supabase) {
    // Prefer the staged draft; fall back to the currently published bundle
    // so callers never accidentally publish stale local state.
    const staged = (await readSupabaseSiteContent("draft")) ?? (await readSupabaseSiteContent("published"));
    if (!staged) {
      throw new Error("Nothing to publish - no draft or published content found.");
    }
    await writeSupabasePublishedContent(staged, actor, note);
    return;
  }

  // Local JSON fallback: publish = copy draft file (or existing published file)
  // onto site-content.json and append to the local revisions log.
  let staged: RidemaxSiteContent;
  try {
    staged = normalizeSiteContent(
      siteContentSchema.parse(await readJsonFile<unknown>(draftSiteContentPath)),
    );
  } catch {
    staged = await readLocalSiteContent();
  }

  await writeJsonFile(siteContentPath, staged);

  try {
    await fs.unlink(draftSiteContentPath);
  } catch {
    // No draft to clear. Fine.
  }

  const existingRevisions = await readLocalRevisions();
  const newRevision = {
    id: `${Date.now()}`,
    slug: primaryContentSlug,
    created_at: new Date().toISOString(),
    created_by: actor,
    note,
    content: staged,
  };
  const truncated = [newRevision, ...existingRevisions].slice(0, REVISION_LIMIT);
  await writeJsonFile(siteContentRevisionsPath, truncated);
}

async function readLocalRevisions(): Promise<Array<RevisionRow & { content?: unknown }>> {
  try {
    return await readJsonFile<Array<RevisionRow & { content?: unknown }>>(siteContentRevisionsPath);
  } catch {
    return [];
  }
}

/**
 * List the most recent revisions for the admin revision drawer. Returns
 * metadata only. `content` is omitted to keep the response small; callers
 * load the full bundle with {@link revertSiteContentToRevision}.
 */
export async function listContentRevisions(limit = 20): Promise<SiteContentRevision[]> {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    const revisionsTable = supabase.from("site_content_revisions") as unknown as RevisionsTable;
    const response = await revisionsTable
      .select("id, slug, created_at, created_by, note")
      .eq("slug", primaryContentSlug)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? []).map(toRevisionMeta);
  }

  const local = await readLocalRevisions();
  return local.slice(0, limit).map(toRevisionMeta);
}

/**
 * Revert the draft to a prior revision so the admin can preview the old
 * version and re-publish it. Does not modify published_content directly.
 * rollback still goes through the Publish button, which keeps a revision
 * entry in place for audit continuity.
 */
export async function revertSiteContentToRevision(revisionId: string) {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    const query = supabase.from("site_content_revisions") as unknown as RevisionContentQuery;
    const response = await query
      .select("id, slug, created_at, created_by, note, content")
      .eq("id", Number(revisionId))
      .maybeSingle();

    if (response.error) {
      throw new Error(response.error.message);
    }

    const data = response.data;

    if (!data?.content) {
      throw new Error("Revision not found.");
    }

    const parsed = normalizeSiteContent(siteContentSchema.parse(data.content));
    await writeSupabaseDraftContent(parsed);
    return parsed;
  }

  const local = await readLocalRevisions();
  const match = local.find((row) => String(row.id) === revisionId);

  if (!match?.content) {
    throw new Error("Revision not found.");
  }

  const parsed = normalizeSiteContent(siteContentSchema.parse(match.content));
  await writeJsonFile(draftSiteContentPath, parsed);
  return parsed;
}

function toRevisionMeta(row: RevisionRow): SiteContentRevision {
  return {
    id: String(row.id),
    slug: row.slug,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
    note: row.note ?? null,
  };
}

export async function savePreviewSiteContent(content: RidemaxSiteContent) {
  const parsed = normalizeSiteContent(siteContentSchema.parse(content));
  await writeJsonFile(previewSiteContentPath, parsed);
}

export async function clearPreviewSiteContent() {
  try {
    await fs.unlink(previewSiteContentPath);
  } catch {
    // Ignore missing preview files.
  }
}

export async function getStorageMode() {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return getConfiguredStorageLabel();
  }

  try {
    const content = await readSupabaseSiteContent("published");
    return content ? "Supabase JSONB bundle" : "Local JSON (Supabase bundle not seeded)";
  } catch {
    return "Local JSON (Supabase fallback)";
  }
}

export async function getProductCatalog() {
  noStore();

  const content = await getSiteContent();

  try {
    const remoteCatalog = await fetchRemoteCatalog(content);

    if (remoteCatalog) {
      return remoteCatalog;
    }
  } catch {
    // External product ownership stays outside the CMS, but the public site still
    // needs a stable fallback while the integration is being wired up.
  }

  return readLocalCatalog();
}

export async function getPageDocument(slug: ContentPageSlug) {
  const content = await getSiteContent();
  return content.pages.find((page) => page.slug === slug) ?? null;
}

export async function listProductCategories() {
  const content = await getSiteContent();
  return content.productCategories;
}

export async function findProductCategory(slug: string) {
  const categories = await listProductCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function listPublishedBrands(categorySlug?: string) {
  const content = await getSiteContent();

  return sortByOrder(
    content.brands.filter(
      (brand) => brand.published && (!categorySlug || brand.categorySlug === categorySlug),
    ),
  );
}

export async function findBrand(slug: string) {
  const content = await getSiteContent();
  return content.brands.find((brand) => brand.slug === slug && brand.published) ?? null;
}

export async function listPublishedPromotions() {
  const content = await getSiteContent();
  return sortPublishedByOrder(content.promotions);
}

export async function findPromotion(slug: string) {
  const promotions = await listPublishedPromotions();
  return promotions.find((promotion) => promotion.slug === slug) ?? null;
}

export async function listPublishedProductItems(categorySlug: string) {
  const catalog = await getProductCatalog();

  return sortByOrder(
    catalog.items.filter((item) => item.published && item.categorySlug === categorySlug),
  );
}

export async function findProductItem(categorySlug: string, itemSlug: string) {
  const items = await listPublishedProductItems(categorySlug);
  return items.find((item) => item.slug === itemSlug) ?? null;
}

export async function findProductItemBySlug(itemSlug: string) {
  const [categories, catalog] = await Promise.all([listProductCategories(), getProductCatalog()]);
  const item = catalog.items.find((candidate) => candidate.slug === itemSlug && candidate.published);

  if (!item) {
    return null;
  }

  const category = categories.find((candidate) => candidate.slug === item.categorySlug) ?? null;

  return category ? { category, item } : null;
}

export async function findAdjacentProductItems(categorySlug: string, itemSlug: string) {
  const items = await listPublishedProductItems(categorySlug);
  const index = items.findIndex((item) => item.slug === itemSlug);

  if (index === -1) {
    return {
      previous: null,
      next: null,
    };
  }

  return {
    previous: index > 0 ? items[index - 1] : null,
    next: index < items.length - 1 ? items[index + 1] : null,
  };
}

export async function listPublishedNews() {
  const content = await getSiteContent();
  return sortPublishedByOrder(content.newsItems);
}

export async function listPublishedEvents() {
  const content = await getSiteContent();
  return sortPublishedByOrder(content.events);
}

export async function listPublishedAwards() {
  const content = await getSiteContent();
  return sortPublishedByOrder(content.awards);
}

export async function listPublishedJobs(departmentSlug?: string) {
  const content = await getSiteContent();

  return sortByOrder(
    content.jobs.filter(
      (job) => job.published && (!departmentSlug || job.departmentSlug === departmentSlug),
    ),
  );
}

export async function listPublishedDepartments() {
  const content = await getSiteContent();
  return sortPublishedByOrder(content.departments);
}

export async function listProjectFeatures() {
  const content = await getSiteContent();
  return sortPublishedByOrder(content.projectFeatures);
}

export async function findJob(slug: string) {
  const content = await getSiteContent();
  return content.jobs.find((job) => job.slug === slug && job.published) ?? null;
}

export async function findEvent(slug: string) {
  const events = await listPublishedEvents();
  return events.find((event) => event.slug === slug) ?? null;
}

function toSearchRecords(
  content: RidemaxSiteContent,
  catalog: ExternalProductCatalog,
): SearchRecord[] {
  const pageRecords: SearchRecord[] = content.pages.map((page) => ({
    title: page.title,
    href: pageHref(page.slug),
    summary: page.summary ?? "",
    kind: "Page",
    keywords: [
      page.slug,
      ...page.blocks.flatMap((block) => [block.title ?? "", block.summary ?? "", block.eyebrow ?? ""]),
    ],
  }));

  const categoryRecords: SearchRecord[] = content.productCategories.map((category) => ({
    title: category.name,
    href: `/products/${category.slug}`,
    summary: category.description,
    kind: "Category",
    image: category.featuredImage,
    keywords: [
      category.slug,
      category.heroTitle,
      category.heroSummary,
      category.browseTitle,
      category.sectionTitle,
      ...category.sections.flatMap((section) => [
        section.title,
        section.subtitle ?? "",
        ...section.paragraphs,
      ]),
    ],
  }));

  const productRecords: SearchRecord[] = catalog.items
    .filter((item) => item.published)
    .map((item) => ({
      title: item.title,
      href: `/product-page/${item.slug}`,
      summary: item.summary,
      kind: "Product" as const,
      image: item.image,
      keywords: [
        item.brand,
        item.sku,
        item.categorySlug,
        ...item.tags,
        ...item.highlights,
        ...item.searchKeywords,
      ],
    }));

  const brandRecords: SearchRecord[] = content.brands
    .filter((brand) => brand.published)
    .map((brand) => ({
      title: brand.label,
      href: brand.href,
      summary: brand.summary,
      kind: "Category" as const,
      image: brand.image,
      keywords: [brand.categorySlug, ...brand.tags],
    }));

  const promotionRecords: SearchRecord[] = content.promotions
    .filter((promotion) => promotion.published)
    .map((promotion) => ({
      title: promotion.title,
      href: "/promotions",
      summary: promotion.summary,
      kind: "Promotion" as const,
      image: promotion.thumbnail,
      keywords: [promotion.slug, ...promotion.tags],
    }));

  const newsRecords: SearchRecord[] = content.newsItems
    .filter((item) => item.published)
    .map((item) => ({
      title: item.title,
      href: "/news",
      summary: item.summary,
      kind: "News" as const,
      image: item.image,
      keywords: [item.slug, item.excerpt],
    }));

  const eventRecords: SearchRecord[] = content.events
    .filter((item) => item.published)
    .map((item) => ({
      title: item.title,
      href: `/events/${item.slug}`,
      summary: `${item.summary} ${item.location}`,
      kind: "Event" as const,
      image: item.image,
      keywords: [item.slug, item.location, item.venue, item.teaserDate],
    }));

  const awardRecords: SearchRecord[] = content.awards
    .filter((item) => item.published)
    .map((item) => ({
      title: item.title,
      href: "/awards",
      summary: item.summary,
      kind: "Award" as const,
      image: item.image,
      keywords: [item.slug, item.year],
    }));

  const jobRecords: SearchRecord[] = content.jobs
    .filter((item) => item.published)
    .map((item) => ({
      title: item.title,
      href: `/careers/${item.slug}`,
      summary: `${item.summary} ${item.location}`,
      kind: "Job" as const,
      keywords: [item.slug, item.departmentSlug, item.location, item.type],
    }));

  return [
    ...pageRecords,
    ...categoryRecords,
    ...productRecords,
    ...brandRecords,
    ...promotionRecords,
    ...newsRecords,
    ...eventRecords,
    ...awardRecords,
    ...jobRecords,
  ];
}

function scoreSearchRecord(record: SearchRecord, query: string) {
  const normalizedQuery = normalize(query);
  const title = normalize(record.title);
  const summary = normalize(record.summary);
  const keywords = (record.keywords ?? []).map(normalize);
  let score = 0;

  if (title === normalizedQuery) {
    score += 900;
  } else if (title.startsWith(normalizedQuery)) {
    score += 550;
  } else if (title.includes(normalizedQuery)) {
    score += 350;
  }

  if (keywords.some((keyword) => keyword === normalizedQuery)) {
    score += 320;
  }

  if (keywords.some((keyword) => keyword.startsWith(normalizedQuery))) {
    score += 180;
  }

  if (summary.includes(normalizedQuery)) {
    score += 90;
  }

  const queryTokens = tokenize(normalizedQuery);
  score += queryTokens.filter((token) => keywords.some((keyword) => keyword.includes(token))).length * 24;

  if (record.kind === "Product") {
    score += 90;
  }

  if (record.kind === "Category") {
    score += 60;
  }

  if (record.kind === "Page") {
    score -= 120;
  }

  return score;
}

export async function searchSite(query: string) {
  const cleanedQuery = normalize(query);

  if (!cleanedQuery) {
    return [];
  }

  const [content, catalog] = await Promise.all([getSiteContent(), getProductCatalog()]);

  return toSearchRecords(content, catalog)
    .map((record) => ({
      record,
      score: scoreSearchRecord(record, cleanedQuery),
      haystack: normalize([record.title, record.summary, ...(record.keywords ?? [])].join(" ")),
    }))
    .filter(({ score, haystack }) => score > 0 && haystack.includes(cleanedQuery))
    .sort((left, right) => right.score - left.score || left.record.title.localeCompare(right.record.title))
    .map(({ record }) => record)
    .slice(0, 16);
}

function toContactMessage(item: ContactMessageRow) {
  return {
    id: item.id,
    firstName: item.first_name,
    lastName: item.last_name,
    email: item.email,
    message: item.message,
    archived: Boolean(item.archived),
    createdAt: item.created_at,
  } satisfies ContactMessage;
}

export async function listContactMessages() {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    noStore();

    const contactTable = supabase.from("contact_messages") as unknown as ContactMessagesTable;
    const response = await contactTable
      .select("id, first_name, last_name, email, message, archived, created_at")
      .order("created_at", { ascending: false });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return (response.data ?? [])
      .map(toContactMessage)
      .filter((message) => !message.archived);
  }

  const localMessages = await readLocalMessages();
  return [...localMessages]
    .filter((message) => !message.archived)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function submitContactMessage(input: ContactMessageInput) {
  const parsed = contactMessageInputSchema.parse(input);
  const message: ContactMessage = {
    id: randomUUID(),
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: parsed.email,
    message: parsed.message,
    createdAt: new Date().toISOString(),
  };

  const supabase = getServerSupabaseClient();

  if (supabase) {
    const contactTable = supabase.from("contact_messages") as unknown as ContactMessagesTable;
    await contactTable.insert({
      id: message.id,
      first_name: message.firstName,
      last_name: message.lastName,
      email: message.email,
      message: message.message,
      archived: false,
      created_at: message.createdAt,
    });

    return message;
  }

  const localMessages = await readLocalMessages();
  localMessages.unshift(message);
  await writeJsonFile(contactMessagesPath, localMessages);

  return message;
}

export async function archiveContactMessage(messageId: string) {
  const supabase = getServerSupabaseClient();

  if (supabase) {
    const contactTable = supabase.from("contact_messages") as unknown as ContactMessagesTable;
    const { error } = await contactTable.update({ archived: true }).eq("id", messageId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const localMessages = await readLocalMessages();
  await writeJsonFile(
    contactMessagesPath,
    localMessages.map((message) =>
      message.id === messageId ? { ...message, archived: true } : message,
    ),
  );
}

export async function getAdminMetrics() {
  const content = await getSiteContent();
  const messages = await listContactMessages();
  const storageMode = await getStorageMode();

  return {
    storageMode,
    counts: {
      pages: content.pages.length,
      categories: content.productCategories.length,
      promotions: content.promotions.length,
      jobs: content.jobs.length,
      events: content.events.length,
      news: content.newsItems.length,
      awards: content.awards.length,
      messages: messages.length,
    },
  };
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export function formatDateTimeRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(start);

  const startTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(start);

  const endTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(end);

  return `${date}, ${startTime} - ${endTime}`;
}

export function pickFeaturedNews(items: NewsItem[]) {
  return sortByOrder(items.filter((item) => item.featured && item.published)).slice(0, 3);
}

export function pickFeaturedEvents(items: EventItem[]) {
  return sortByOrder(items.filter((item) => item.published)).slice(0, 3);
}

export function pickFeaturedJobs(items: JobOpening[]) {
  return sortByOrder(items.filter((item) => item.published && item.featured)).slice(0, 2);
}

export function pickFeaturedCategories(items: ProductCategory[]) {
  return items.slice(0, 3);
}

export function pickFeaturedBrands(items: BrandFeature[]) {
  return sortPublishedByOrder(items).slice(0, 5);
}

export function pickFeaturedAwards(items: AwardItem[]) {
  return sortByOrder(items.filter((item) => item.published)).slice(0, 3);
}

export function pickFeaturedPromotions(items: PromotionItem[]) {
  return sortByOrder(items.filter((item) => item.published && item.featured)).slice(0, 3);
}

export function pickOrderedProjects(items: ProjectFeature[]) {
  return sortByOrder(items.filter((item) => item.published));
}
