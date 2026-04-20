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
const previewSiteContentPath = path.join(process.cwd(), "data", "preview-site-content.json");
const contactMessagesPath = path.join(process.cwd(), "data", "contact-messages.json");
const catalogProductsPath = path.join(process.cwd(), "data", "catalog-products.json");
const primaryContentSlug = "primary";

type ContentDocumentTable = {
  upsert: (
    value: { slug: string; content: RidemaxSiteContent },
    options: { onConflict: string },
  ) => Promise<{ error: { message: string } | null }>;
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

async function readSupabaseSiteContent() {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const response = await supabase
    .from("site_content_documents")
    .select("content")
    .eq("slug", primaryContentSlug)
    .maybeSingle();
  const data = response.data as { content?: unknown } | null;
  const error = response.error;

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.content) {
    return null;
  }

  return normalizeSiteContent(siteContentSchema.parse(data.content));
}

async function writeSupabaseSiteContent(content: RidemaxSiteContent) {
  const supabase = getServerSupabaseClient();

  if (!supabase) {
    return false;
  }

  const contentTable = supabase.from("site_content_documents") as unknown as ContentDocumentTable;
  const { error } = await contentTable.upsert(
    {
      slug: primaryContentSlug,
      content,
    },
    {
      onConflict: "slug",
    },
  );

  if (error) {
    throw new Error(error.message);
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

export async function getSiteContent(): Promise<RidemaxSiteContent> {
  noStore();
  const preview = await draftMode();

  if (preview.isEnabled) {
    try {
      return await readPreviewSiteContent();
    } catch {
      // Preview mode is best-effort; fall through to the persisted content.
    }
  }

  try {
    const supabaseContent = await readSupabaseSiteContent();

    if (supabaseContent) {
      return supabaseContent;
    }
  } catch {
    // The EC2 path prefers the local bundle when Supabase is missing or not seeded.
  }

  return readLocalSiteContent();
}

export async function saveSiteContent(content: RidemaxSiteContent) {
  const parsed = normalizeSiteContent(siteContentSchema.parse(content));

  if (await writeSupabaseSiteContent(parsed)) {
    return;
  }

  await writeJsonFile(siteContentPath, parsed);
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
    const content = await readSupabaseSiteContent();
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
