"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminImageGalleryField,
  AdminImageUploadField,
  type AdminNoticeTone,
} from "@/components/admin-media-fields";
import {
  collectionVariantForSource,
  createPageBlockTemplate,
  getPageBlockAppearanceFields,
  getPageBlockFields,
  getPageBlockLabel,
  pageBlockTypeOptions,
  pageSlugOptions,
  sanitizePageBlockAppearance,
  type SelectOption,
} from "@/lib/page-builder";
import type {
  CategorySection,
  ContactMessage,
  CollectionGridSource,
  Department,
  ContentPageSlug,
  ExternalProductCatalog,
  MediaAsset,
  PageBlock,
  PageDocument,
  ProductCategory,
  ProductItem,
  RidemaxSiteContent,
  SocialPlatform,
} from "@/lib/ridemax-types";
import type { JobApplication } from "@/lib/server/job-applications";

export type AdminView =
  | "overview"
  | "settings"
  | "pages"
  | "events"
  | "promotions"
  | "careers"
  | "media";

type AdminDashboardProps = {
  initialContent: RidemaxSiteContent;
  initialCatalog: ExternalProductCatalog;
  messages: ContactMessage[];
  storageMode: string;
  initialMediaAssets: MediaAsset[];
  initialJobApplications: JobApplication[];
  view: AdminView;
  previewMode: boolean;
};

type FieldType =
  | "text"
  | "textarea"
  | "checkbox"
  | "datetime"
  | "select"
  | "image"
  | "image-list";

type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  options?: SelectOption[];
  parse?: (value: unknown) => unknown;
  format?: (value: unknown) => string;
  helpText?: string;
  maxLength?: number;
};

type ToastMessage = {
  id: number;
  tone: AdminNoticeTone;
  message: string;
};

type SaveState = "idle" | "saving" | "success" | "published" | "error";

type FieldCallbacks = {
  onNotice: (tone: AdminNoticeTone, message: string) => void;
  onAssetUploaded: (asset: MediaAsset) => void;
};

const primaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#8d120e] px-5 text-sm font-semibold text-white shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#a51611] hover:shadow-[0_12px_26px_rgba(141,18,14,0.18)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d120e]/30 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm";
const secondaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-[#220707] shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:border-[#8d120e]/25 hover:bg-[#f7f2f1] hover:shadow-[0_10px_24px_rgba(31,20,19,0.10)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d120e]/25 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm";
// Compact circular icon button used for reorder / remove controls on list items
// and page blocks. The visual language matches the sidebar icons: 36x36 circle,
// border, subtle hover lift. Disabled buttons lose the hover lift and fade out
// so "can't move up any further" is obvious without surfacing new error UX.
const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[#220707] shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:border-[#8d120e]/25 hover:bg-[#f7f2f1] hover:shadow-[0_10px_22px_rgba(31,20,19,0.10)] active:translate-y-0 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d120e]/25 disabled:pointer-events-none disabled:opacity-40";
const destructiveIconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#8d120e]/30 bg-white text-[#8d120e] shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#fff4f3] hover:shadow-[0_10px_22px_rgba(141,18,14,0.12)] active:translate-y-0 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d120e]/25 disabled:pointer-events-none disabled:opacity-40";
const dragHandleClass =
  "inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-black/10 bg-white text-[#6a433d] shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:border-[#8d120e]/25 hover:bg-[#f7f2f1] hover:shadow-[0_10px_22px_rgba(31,20,19,0.10)] active:translate-y-0 active:scale-[0.94] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d120e]/25";
const fieldControlClass =
  "mt-1 w-full rounded-[1rem] border border-black/12 bg-white px-3 py-2.5 outline-none transition duration-150 ease-out hover:border-[#8d120e]/30 hover:shadow-[0_8px_20px_rgba(31,20,19,0.07)] focus:border-[#8d120e] focus:shadow-[0_0_0_3px_rgba(141,18,14,0.08)] focus-visible:ring-2 focus-visible:ring-[#8d120e]/20";
const rowActionRailClass = "flex min-w-max shrink-0 flex-nowrap items-center justify-end gap-2";

// Lightweight inline SVG icons. Kept local to avoid pulling in an icon library
// for three glyphs - the admin surface is tightly controlled and already ships
// its own hand-authored SVG assets elsewhere.
function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 19V5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
      <path d="M5 12.5l4.25 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTimeFieldValue(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function clone<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readValue(target: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, target);
}

function writeValue<T>(target: T, path: string, nextValue: unknown) {
  const draft = clone(target) as Record<string, unknown>;
  const keys = path.split(".");
  let current: Record<string, unknown> = draft;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = nextValue;
      return;
    }

    const next = current[key];
    if (!next || typeof next !== "object") {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  });

  return draft as T;
}

function withSequentialOrder<T>(items: T[]) {
  return items.map((item, index) => {
    if (item && typeof item === "object" && "order" in (item as Record<string, unknown>)) {
      return { ...(item as Record<string, unknown>), order: index + 1 } as T;
    }

    return item;
  });
}

function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return withSequentialOrder(next);
}

function toLineList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).join("\n") : String(value ?? "");
}

function fromLineList(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toLinkPairs(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => {
      const entry = item as { label?: unknown; href?: unknown };
      return `${String(entry.label ?? "").trim()} | ${String(entry.href ?? "").trim()}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function fromLinkPairs(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());
      return { label: label ?? "", href: href ?? "" };
    });
}

function toFeaturePairs(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => {
      const entry = item as { title?: unknown; summary?: unknown };
      return `${String(entry.title ?? "").trim()} | ${String(entry.summary ?? "").trim()}`.trim();
    })
    .filter(Boolean)
    .join("\n");
}

function fromFeaturePairs(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, summary] = line.split("|").map((part) => part.trim());
      return { title: title ?? "", summary: summary ?? "" };
    });
}

function parseNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeFieldValue(field: FieldConfig, value: unknown) {
  if (field.parse) {
    return field.parse(value);
  }

  if (field.type === "datetime") {
    return typeof value === "string" && value ? new Date(value).toISOString() : "";
  }

  return value;
}

function standardTextLimitForField(field: FieldConfig) {
  if (field.maxLength || !["text", "textarea"].includes(field.type)) {
    return field.maxLength;
  }

  const signature = `${field.key} ${field.label}`.toLowerCase();

  if (/(href|url|src|image|endpoint|map)/.test(signature)) return 2048;
  if (/email/.test(signature)) return 320;
  if (/phone/.test(signature)) return 40;
  if (/slug/.test(signature)) return 80;
  if (/(title|name|label|eyebrow|venue|location)/.test(signature)) return 80;
  if (/(summary|excerpt|description|intro|footer|teaser)/.test(signature)) return 200;
  if (/(paragraph|message|notes)/.test(signature)) return 800;

  return field.type === "textarea" ? 400 : 160;
}

function FieldMeta({ field, value, maxLength }: { field: FieldConfig; value: string; maxLength?: number }) {
  if (!field.helpText && (!maxLength || maxLength > 800)) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[0.72rem] leading-5 text-[#7e5a53]">
      {field.helpText ? <span>{field.helpText}</span> : <span />}
      {maxLength && maxLength <= 800 ? (
        <span className={value.length > maxLength * 0.9 ? "font-semibold text-[#8d120e]" : ""}>
          {value.length}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}

function defaultValueForFieldKey(key: string) {
  switch (key) {
    case "appearance.background":
      return "surface-1";
    case "appearance.decoration.style":
      return "none";
    case "appearance.decoration.color":
      return "brand-red";
    case "appearance.decoration.position":
      return "bottom";
    case "appearance.decoration.size":
      return "md";
    case "appearance.headingScale":
      return "standard";
    case "appearance.headingStyle":
      return "standard";
    case "appearance.textColorScheme":
      return "default";
    case "appearance.cardPreset":
      return "standard";
    case "appearance.layoutPreset":
      return "standard";
    case "appearance.bodyTextPreset":
      return "standard";
    case "appearance.ctaPreset":
      return "solid";
    case "minHeight":
      return "min-h-[28rem]";
    default:
      return undefined;
  }
}

function isWideField(field: FieldConfig) {
  return field.type === "textarea" || field.type === "image" || field.type === "image-list";
}

function displayFieldValue(item: Record<string, unknown>, field: FieldConfig) {
  const value = readValue(item, field.key);

  if (field.format) {
    return field.format(value);
  }

  if (field.type === "textarea") {
    return Array.isArray(value) ? toLineList(value) : String(value ?? "");
  }

  if (field.type === "checkbox") {
    return Boolean(value);
  }

  if (field.type === "datetime") {
    return formatDateTimeFieldValue(value);
  }

  if (field.type === "image-list") {
    return Array.isArray(value) ? value.map(String) : [];
  }

  return String(value ?? defaultValueForFieldKey(field.key) ?? "");
}

function readPreviewText(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readValue(item, key);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function collectionItemTitle(item: Record<string, unknown>, fallback: string) {
  return readPreviewText(item, ["title", "name", "label", "slug", "id"]) || fallback;
}

function collectionItemSummary(item: Record<string, unknown>) {
  const value = readValue(item, "startAt");
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  return readPreviewText(item, ["summary", "description", "excerpt", "subtitle", "categorySlug"]);
}

function collectionItemImage(item: Record<string, unknown>) {
  const image = readPreviewText(item, [
    "image",
    "thumbnail",
    "featuredImage",
    "detailImage",
    "heroImage.src",
  ]);
  return image || null;
}

function collectionBlockOptionsForPage(slug: PageDocument["slug"]) {
  const allowedBySlug: Record<PageDocument["slug"], PageBlock["type"][]> = {
    home: ["hero", "brandMarquee", "categoryTiles", "collectionGrid", "imageMarquee", "showcase", "contact", "richText"],
    products: ["hero", "collectionGrid", "richText"],
    tires: ["hero", "brandMarquee", "collectionGrid", "categorySections", "richText"],
    rims: ["hero", "brandMarquee", "collectionGrid", "categorySections", "richText"],
    accessories: ["hero", "brandMarquee", "collectionGrid", "categorySections", "richText"],
    careers: ["hero", "imageMarquee", "showcase", "jobsList", "richText"],
    about: ["hero", "showcase", "featureGrid", "contact", "richText"],
    "events-awards": ["hero", "collectionGrid", "projectList", "richText"],
    news: ["hero", "collectionGrid", "richText"],
    events: ["hero", "collectionGrid", "calendar", "richText"],
    awards: ["hero", "collectionGrid", "richText"],
    promotions: ["hero", "collectionGrid", "richText"],
    search: ["hero", "searchFilters", "richText"],
  };
  const allowed = new Set(allowedBySlug[slug] ?? ["hero", "collectionGrid", "richText"]);
  return pageBlockTypeOptions.filter((option) => allowed.has(option.value as PageBlock["type"]));
}

function collectionSourceOptionsForPage(slug: PageDocument["slug"]) {
  const labels: Record<CollectionGridSource, string> = {
    brands: "Brands",
    news: "News",
    events: "Events",
    awards: "Awards",
    promotions: "Promotions",
    catalogCategories: "Catalog Categories",
  };
  const allowedBySlug: Record<PageDocument["slug"], CollectionGridSource[]> = {
    home: ["brands", "news", "events", "promotions"],
    products: ["catalogCategories"],
    tires: ["brands"],
    rims: ["brands"],
    accessories: ["brands"],
    careers: [],
    about: [],
    "events-awards": ["news", "events", "awards"],
    news: ["news"],
    events: ["events"],
    awards: ["awards"],
    promotions: ["promotions"],
    search: [],
  };

  return allowedBySlug[slug].map((value) => ({ label: labels[value], value }));
}

function scopedBrands(
  brands: RidemaxSiteContent["brands"],
  categorySlug: string,
) {
  return brands.filter((brand) => brand.categorySlug === categorySlug);
}

function mergeScopedBrands(
  brands: RidemaxSiteContent["brands"],
  categorySlug: string,
  scopedItems: Record<string, unknown>[],
) {
  const nextScopedBrands = scopedItems.map((item, index) => ({
    ...(item as RidemaxSiteContent["brands"][number]),
    categorySlug,
    href: `/products/${categorySlug}?brand=${String(item.slug ?? "")}`,
    order: parseNumber(item.order, index + 1),
  }));

  return [
    ...brands.filter((brand) => brand.categorySlug !== categorySlug),
    ...nextScopedBrands,
  ];
}

const editableCatalogPageSlugs = ["tires", "rims", "accessories"] as const;
type EditableCatalogPageSlug = (typeof editableCatalogPageSlugs)[number];

function isEditableCatalogPageSlug(slug: ContentPageSlug): slug is EditableCatalogPageSlug {
  return (editableCatalogPageSlugs as readonly string[]).includes(slug);
}

function labelForCategorySlug(slug: string) {
  return pageSlugOptions.find((option) => option.value === slug)?.label ?? slug;
}

function publicPathForPageSlug(slug: ContentPageSlug) {
  switch (slug) {
    case "home":
      return "/";
    case "tires":
    case "rims":
    case "accessories":
      return `/products/${slug}`;
    case "events-awards":
      return "/events-awards";
    default:
      return `/${slug}`;
  }
}

function createProductCategoryTemplate(slug: EditableCatalogPageSlug): ProductCategory {
  const label = labelForCategorySlug(slug);

  return {
    slug,
    name: label,
    description: "",
    heroTitle: label,
    heroSummary: "",
    heroImage: { src: "", alt: `${label} category visual` },
    featuredImage: "",
    browseTitle: `Featured ${label}`,
    browseSummary: "",
    sectionTitle: `${label} Categories`,
    sectionSummary: "",
    sections: [],
  };
}

function readScopedCategory(
  categories: ProductCategory[],
  categorySlug: EditableCatalogPageSlug,
) {
  return categories.find((category) => category.slug === categorySlug) ?? createProductCategoryTemplate(categorySlug);
}

function upsertScopedCategory(
  categories: ProductCategory[],
  categorySlug: EditableCatalogPageSlug,
  nextCategory: ProductCategory,
) {
  const normalizedCategory = {
    ...nextCategory,
    slug: categorySlug,
    sections: nextCategory.sections ?? [],
  };
  const hasCategory = categories.some((category) => category.slug === categorySlug);

  return hasCategory
    ? categories.map((category) => (category.slug === categorySlug ? normalizedCategory : category))
    : [...categories, normalizedCategory];
}

function normalizeCategorySections(items: Record<string, unknown>[]): CategorySection[] {
  return items.map((item, index) => ({
    id: String(item.id ?? ""),
    slug: String(item.slug ?? ""),
    title: String(item.title ?? ""),
    subtitle: String(item.subtitle ?? ""),
    image: String(item.image ?? ""),
    imageAlt: String(item.imageAlt ?? ""),
    paragraphs: Array.isArray(item.paragraphs) ? item.paragraphs.map(String) : [],
    published: Boolean(item.published ?? true),
    order: parseNumber(item.order, index + 1),
  }));
}

function scopedProductItems(catalog: ExternalProductCatalog, categorySlug: string) {
  return catalog.items.filter((item) => item.categorySlug === categorySlug);
}

function mergeScopedProductItems(
  catalog: ExternalProductCatalog,
  categorySlug: string,
  scopedItems: Record<string, unknown>[],
) {
  const nextScopedItems = scopedItems.map((item, index) => ({
    ...(item as ProductItem),
    categorySlug,
    sku: typeof item.sku === "string" ? item.sku : "",
    highlights: Array.isArray(item.highlights) ? item.highlights.map(String) : [],
    gallery: Array.isArray(item.gallery) ? item.gallery.map(String) : [],
    sizes: Array.isArray(item.sizes) ? item.sizes.map(String) : [],
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    searchKeywords: Array.isArray(item.searchKeywords) ? item.searchKeywords.map(String) : [],
    published: Boolean(item.published ?? true),
    order: parseNumber(item.order, index + 1),
  }));

  return {
    ...catalog,
    items: [
      ...catalog.items.filter((item) => item.categorySlug !== categorySlug),
      ...nextScopedItems,
    ],
  } satisfies ExternalProductCatalog;
}

function syncCatalogSnapshot(
  content: RidemaxSiteContent,
  catalog: ExternalProductCatalog,
) {
  return {
    ...catalog,
    source: content.catalogSource,
    categories: content.productCategories.map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
    })),
  } satisfies ExternalProductCatalog;
}

function ToastStack({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[10000] flex max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-[1.25rem] border px-4 py-3 text-sm shadow-[0_18px_44px_rgba(31,20,19,0.12)] ${
            toast.tone === "success"
              ? "border-[#8d120e]/20 bg-white text-[#220707]"
              : toast.tone === "error"
                ? "border-[#a51611]/25 bg-[#fff4f3] text-[#8d120e]"
                : "border-black/10 bg-white text-[#220707]"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function SaveActionBar({
  canSave,
  dirty,
  saving,
  previewing,
  publishing,
  saveState,
  lastSavedAt,
  previewMode,
  onSave,
  onPreview,
  onPublish,
  onOpenRevisions,
}: {
  canSave: boolean;
  dirty: boolean;
  saving: boolean;
  previewing: boolean;
  publishing: boolean;
  saveState: SaveState;
  lastSavedAt: string | null;
  previewMode: boolean;
  onSave: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onOpenRevisions: () => void;
}) {
  if (!canSave) {
    return null;
  }

  const lastSavedLabel = lastSavedAt
    ? new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  // Mental model (Wix): "Save" writes a draft, "Publish" makes it live.
  // Status copy is phrased around the draft so marketing understands the
  // site is NOT updated until they press Publish.
  const statusLabel =
    saveState === "saving"
      ? "Saving draft..."
      : saveState === "error"
        ? "Save failed. Check the highlighted message."
        : saveState === "published" && !dirty
          ? "Published - public site is live"
        : dirty
          ? "Unsaved changes"
          : saveState === "success"
            ? `Draft saved${lastSavedLabel ? ` at ${lastSavedLabel}` : ""} - press Publish to go live`
            : "No draft changes";

  return (
    <div className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-5xl rounded-[1.5rem] border border-black/10 bg-white/95 p-3 shadow-[0_18px_50px_rgba(31,20,19,0.18)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
              (saveState === "success" || saveState === "published") && !dirty
                ? "bg-[#255c2f] text-white"
                : saveState === "error"
                  ? "bg-[#fff4f3] text-[#8d120e]"
                  : "bg-[#f7f2f1] text-[#5d0d0a]"
            }`}
          >
            {(saveState === "success" || saveState === "published") && !dirty ? <CheckIcon /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#220707]">{statusLabel}</p>
            <p className="text-xs leading-5 text-[#6a433d]">
              Save keeps changes as a draft. Publish makes them live on the public site.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <button type="button" onClick={onOpenRevisions} className={secondaryButtonClass}>
            Revisions
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={previewing || saving || publishing}
            className={secondaryButtonClass}
            title={
              previewMode
                ? "Re-opens the preview tab with your latest draft."
                : "Opens the public site in preview mode in a new tab."
            }
          >
            {previewing
              ? previewMode
                ? "Refreshing Preview..."
                : "Opening Preview..."
              : previewMode
                ? "Refresh Preview"
                : "Preview"}
          </button>
          {previewMode ? (
            <a
              href="/api/admin/preview/disable?path=/admin"
              className={secondaryButtonClass}
              title="Turn off preview mode and return to the public site's published content."
            >
              Exit Preview
            </a>
          ) : null}
          <button type="button" onClick={onSave} disabled={saving || publishing || !dirty} className={primaryButtonClass}>
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing || saving || dirty}
            title={dirty ? "Save the draft before publishing." : undefined}
            className={`inline-flex cursor-pointer items-center justify-center rounded-full border border-[#255c2f] bg-[#255c2f] px-5 py-2.5 text-sm font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#1e4a26] hover:shadow-[0_12px_26px_rgba(37,92,47,0.22)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#255c2f]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none`}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

type RevisionEntry = {
  id: string;
  createdAt: string;
  createdBy: string | null;
  note: string | null;
};

function RevisionsDrawer({
  open,
  loading,
  revisions,
  reverting,
  onClose,
  onRevert,
}: {
  open: boolean;
  loading: boolean;
  revisions: RevisionEntry[];
  reverting: string | null;
  onClose: () => void;
  onRevert: (id: string) => void;
}) {
  if (!open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[95] flex justify-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#220707]">Revision History</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-3 py-1 text-sm text-[#6a433d] hover:bg-[#f7f2f1]"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-[#6a433d]">Loading revisions...</p>
          ) : revisions.length === 0 ? (
            <p className="text-sm text-[#6a433d]">No revisions yet. The first publish creates one.</p>
          ) : (
            <ul className="space-y-3">
              {revisions.map((revision) => {
                const when = new Date(revision.createdAt).toLocaleString();
                const isReverting = reverting === revision.id;
                return (
                  <li
                    key={revision.id}
                    className="rounded-xl border border-black/10 bg-[#faf8f7] p-4"
                  >
                    <div className="text-sm font-semibold text-[#220707]" suppressHydrationWarning>
                      {when}
                    </div>
                    {revision.createdBy ? (
                      <div className="text-xs text-[#6a433d]">by {revision.createdBy}</div>
                    ) : null}
                    {revision.note ? (
                      <p className="mt-2 text-xs leading-5 text-[#4d3b37]">{revision.note}</p>
                    ) : null}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => onRevert(revision.id)}
                        disabled={isReverting}
                        className="cursor-pointer rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#5d0d0a] transition hover:bg-[#fcefee] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isReverting ? "Reverting..." : "Restore as draft"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-black/10 bg-[#faf8f7] px-5 py-3 text-[0.7rem] leading-5 text-[#7e5a53]">
          Restore copies the snapshot back into the current draft. Preview it, then press Publish to make it live.
        </div>
      </div>
    </div>
  );
}

// Textarea with local state so fields that use parse (e.g. fromLineList) don't
// strip trailing newlines on every keystroke. Parse runs on blur only.
function TextareaField({
  displayValue,
  field,
  maxLength,
  onChange,
}: {
  displayValue: string;
  field: FieldConfig;
  maxLength?: number;
  onChange: (value: unknown) => void;
}) {
  const [localValue, setLocalValue] = useState(displayValue);
  const lastExternalRef = useRef(displayValue);

  useEffect(() => {
    if (lastExternalRef.current !== displayValue) {
      lastExternalRef.current = displayValue;
      setLocalValue(displayValue);
    }
  }, [displayValue]);

  if (field.parse) {
    return (
      <>
        <textarea
          value={localValue}
          maxLength={maxLength}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={() => {
            const committed = normalizeFieldValue(field, localValue);
            const committedDisplay = Array.isArray(committed) ? toLineList(committed) : String(committed ?? "");
            lastExternalRef.current = committedDisplay;
            onChange(committed);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className={`${fieldControlClass} min-h-[8rem] resize-y`}
        />
        <FieldMeta field={field} value={localValue} maxLength={maxLength} />
      </>
    );
  }

  return (
    <>
      <textarea
        value={displayValue}
        maxLength={maxLength}
        onChange={(event) => onChange(normalizeFieldValue(field, event.target.value))}
        onKeyDown={(event) => event.stopPropagation()}
        className={`${fieldControlClass} min-h-[8rem] resize-y`}
      />
      <FieldMeta field={field} value={displayValue} maxLength={maxLength} />
    </>
  );
}

function renderField(
  item: Record<string, unknown>,
  field: FieldConfig,
  onChange: (value: unknown) => void,
  callbacks: FieldCallbacks,
) {
  const rawValue = readValue(item, field.key);
  const value = displayFieldValue(item, field);
  const stringValue = String(value);
  const maxLength = standardTextLimitForField(field);

  if (field.type === "image") {
    return (
      <AdminImageUploadField
        value={typeof rawValue === "string" ? rawValue : ""}
        onChange={onChange}
        helpText={field.helpText}
        onNotice={callbacks.onNotice}
        onAssetUploaded={callbacks.onAssetUploaded}
      />
    );
  }

  if (field.type === "image-list") {
    return (
      <AdminImageGalleryField
        value={Array.isArray(rawValue) ? rawValue.map(String) : []}
        onChange={onChange as (value: string[]) => void}
        helpText={field.helpText}
        onNotice={callbacks.onNotice}
        onAssetUploaded={callbacks.onAssetUploaded}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <TextareaField
        displayValue={stringValue}
        field={field}
        maxLength={maxLength}
        onChange={onChange}
      />
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[#2b1512] transition hover:-translate-y-0.5 hover:bg-[#faf8f7]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(Boolean(normalizeFieldValue(field, event.target.checked)))}
        />
        Enabled
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <>
        <select
          value={stringValue}
          onChange={(event) => onChange(normalizeFieldValue(field, event.target.value))}
          className={fieldControlClass}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldMeta field={field} value={stringValue} maxLength={maxLength} />
      </>
    );
  }

  return (
    <>
      <input
        type={field.type === "datetime" ? "datetime-local" : "text"}
        value={stringValue}
        maxLength={maxLength}
        onChange={(event) => onChange(normalizeFieldValue(field, event.target.value))}
        className={fieldControlClass}
      />
      <FieldMeta field={field} value={stringValue} maxLength={maxLength} />
    </>
  );
}

function SectionCard({
  sectionId,
  title,
  description,
  children,
}: {
  sectionId?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={sectionId}
      className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(28,20,19,0.06)]"
    >
      <div>
        <h2 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[#5c4743]">{description}</p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SingletonSection({
  sectionId,
  title,
  description,
  value,
  fields,
  onChange,
  fieldCallbacks,
}: {
  sectionId?: string;
  title: string;
  description: string;
  value: Record<string, unknown>;
  fields: FieldConfig[];
  onChange: (value: Record<string, unknown>) => void;
  fieldCallbacks: FieldCallbacks;
}) {
  return (
    <SectionCard sectionId={sectionId} title={title} description={description}>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label key={`${title}-${field.key}`} className={isWideField(field) ? "md:col-span-2" : ""}>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
              {field.label}
            </span>
            {renderField(
              value,
              field,
              (nextValue) => onChange(writeValue(value, field.key, nextValue) as Record<string, unknown>),
              fieldCallbacks,
            )}
          </label>
        ))}
      </div>
    </SectionCard>
  );
}

function CollectionSection({
  sectionId,
  title,
  description,
  items,
  template,
  fields,
  addLabel = "Add Item",
  itemLabel = "Item",
  onChange,
  fieldCallbacks,
}: {
  sectionId?: string;
  title: string;
  description: string;
  items: Record<string, unknown>[];
  template: Record<string, unknown>;
  fields: FieldConfig[];
  addLabel?: string;
  itemLabel?: string;
  onChange: (items: Record<string, unknown>[]) => void;
  fieldCallbacks: FieldCallbacks;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [expandedIndexes, setExpandedIndexes] = useState<Record<number, boolean>>({});
  const itemRefs = useRef<Record<number, HTMLElement | null>>({});

  useEffect(() => {
    if (highlightedIndex === null) {
      return;
    }

    const node = itemRefs.current[highlightedIndex];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timeout = window.setTimeout(() => {
      setHighlightedIndex(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [items.length, highlightedIndex]);

  function handleAdd() {
    const nextItems = withSequentialOrder([...items, clone(template)]);
    const nextIndex = nextItems.length - 1;
    onChange(nextItems);
    setHighlightedIndex(nextIndex);
    setExpandedIndexes((current) => ({ ...current, [nextIndex]: true }));
    fieldCallbacks.onNotice("success", `${itemLabel} added successfully.`);
  }

  return (
    <SectionCard sectionId={sectionId} title={title} description={description}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7e5a53]">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <button type="button" onClick={handleAdd} className={primaryButtonClass}>
          {addLabel}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const isExpanded = Boolean(expandedIndexes[index] ?? highlightedIndex === index);
          const previewImage = collectionItemImage(item);
          const previewTitle = collectionItemTitle(item, `${itemLabel} ${index + 1}`);
          const previewSummary = collectionItemSummary(item);
          const isPublished = readValue(item, "published");

          return (
            <article
              key={`${title}-${index}`}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) {
                  return;
                }

                onChange(moveItem(items, dragIndex, index));
                fieldCallbacks.onNotice("success", `${itemLabel} moved.`);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`rounded-[1.5rem] border bg-[#faf8f7] p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(31,20,19,0.08)] ${
                highlightedIndex === index
                  ? "border-[#8d120e]/35 ring-2 ring-[#8d120e]/15"
                  : "border-black/10"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={dragHandleClass}
                    role="img"
                    aria-label={`Drag to reorder ${itemLabel.toLowerCase()} ${index + 1}`}
                    title="Drag to reorder"
                  >
                    <DragHandleIcon />
                  </span>
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white">
                    {previewImage ? (
                      <Image
                        src={previewImage}
                        alt=""
                        fill
                        sizes="96px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#8a6b65]">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                      {itemLabel} {index + 1}
                    </p>
                    <h3 className="mt-1 truncate text-xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {previewTitle}
                    </h3>
                    {previewSummary ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6a433d]">{previewSummary}</p>
                    ) : null}
                    {typeof isPublished === "boolean" ? (
                      <span className="mt-2 inline-flex rounded-full border border-black/10 bg-white px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6a433d]">
                        {isPublished ? "Published" : "Hidden"}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className={rowActionRailClass}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedIndexes((current) => ({ ...current, [index]: !isExpanded }));
                      fieldCallbacks.onNotice("info", isExpanded ? `${itemLabel} collapsed.` : `Editing ${itemLabel.toLowerCase()}.`);
                    }}
                    className={secondaryButtonClass}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Collapse" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      if (index > 0) {
                        onChange(moveItem(items, index, index - 1));
                        fieldCallbacks.onNotice("success", `${itemLabel} moved up.`);
                      }
                    }}
                    className={iconButtonClass}
                    aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
                    title="Move up"
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    type="button"
                    disabled={index >= items.length - 1}
                    onClick={() => {
                      if (index < items.length - 1) {
                        onChange(moveItem(items, index, index + 1));
                        fieldCallbacks.onNotice("success", `${itemLabel} moved down.`);
                      }
                    }}
                    className={iconButtonClass}
                    aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} down`}
                    title="Move down"
                  >
                    <ArrowDownIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(withSequentialOrder(items.filter((_, itemIndex) => itemIndex !== index)));
                      fieldCallbacks.onNotice("success", `${itemLabel} removed.`);
                    }}
                    className={destructiveIconButtonClass}
                    aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                    title="Remove"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-5 grid gap-4 border-t border-black/8 pt-5 md:grid-cols-2">
                  {fields.map((field) => (
                    <label key={field.key} className={isWideField(field) ? "md:col-span-2" : ""}>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                        {field.label}
                      </span>
                      {renderField(
                        item,
                        field,
                        (nextValue) => {
                          const next = [...items];
                          next[index] = writeValue(item, field.key, nextValue) as Record<string, unknown>;
                          onChange(next);
                        },
                        fieldCallbacks,
                      )}
                    </label>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}

function toPageBuilderFieldConfig(field: ReturnType<typeof getPageBlockFields>[number]): FieldConfig {
  let type = field.type as FieldType;
  let label = field.label.replace(/ URL$/i, "");

  if (field.key === "imagesText") {
    type = "image-list";
    label = "Images";
  } else if (field.key === "image.src" || field.key === "image") {
    type = "image";
  }

  return {
    key: field.key,
    label,
    type,
    options: field.options,
    helpText: field.helpText,
    format:
      field.key === "tilesText"
        ? toLinkPairs
        : field.key === "itemsText"
          ? toFeaturePairs
          : undefined,
    parse:
      field.key === "tilesText"
          ? fromLinkPairs
        : field.key === "itemsText"
          ? fromFeaturePairs
          : field.key === "categoryOptions" || field.key === "sortOptions"
            ? fromLineList
          : field.key === "limit"
            ? (value) => parseNumber(value, 0)
            : field.key === "maxSuggestions"
              ? (value) => parseNumber(value, 6)
            : undefined,
  };
}

function updatePageBlockField(block: PageBlock, fieldKey: string, nextValue: unknown) {
  const nextBlock = writeValue(block, fieldKey, nextValue) as PageBlock;

  if (block.type === "collectionGrid" && fieldKey === "source") {
    return sanitizePageBlockAppearance({
      ...nextBlock,
      variant: collectionVariantForSource(nextValue as CollectionGridSource),
    } as PageBlock);
  }

  return sanitizePageBlockAppearance(nextBlock);
}

function CollectionGridNote({ block }: { block: Extract<PageBlock, { type: "collectionGrid" }> }) {
  return (
    <div className="rounded-[1.25rem] border border-[#8d120e]/15 bg-[#fff7f6] px-4 py-3 text-sm leading-6 text-[#6a433d] md:col-span-2">
      This section pulls cards from {block.source === "catalogCategories" ? "Catalog Categories" : block.source}.
      Edit the card image in that collection below, then use this block only to place and filter the section.
    </div>
  );
}

function PageBuilderSection({
  pages,
  onChange,
  fieldCallbacks,
  activePageSlug,
  onActivePageSlugChange,
  onBlockEdited,
}: {
  pages: PageDocument[];
  onChange: (pages: PageDocument[]) => void;
  fieldCallbacks: FieldCallbacks;
  activePageSlug: ContentPageSlug;
  onActivePageSlugChange: (slug: ContentPageSlug) => void;
  onBlockEdited: (blockId: string) => void;
}) {
  const [pendingBlockTypes, setPendingBlockTypes] = useState<Record<string, string>>(
    Object.fromEntries(pages.map((page) => [page.id, "richText"])),
  );
  const [activePageId, setActivePageId] = useState(() => pages.find((page) => page.slug === activePageSlug)?.id ?? pages[0]?.id ?? "");
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [expandedBlockIds, setExpandedBlockIds] = useState<Record<string, boolean>>({});
  const activePageEditorRef = useRef<HTMLElement | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  // Drag state scoped to a single page (slug) so dragging a block in one page
  // never lets you drop it into another. Blocks always belong to exactly
  // one page, and the reorder logic below relies on that invariant.
  const [blockDrag, setBlockDrag] = useState<{ pageId: string; index: number } | null>(null);

  function reorderBlocks(pageId: string, from: number, to: number) {
    onChange(
      pages.map((candidate) =>
        candidate.id === pageId
          ? { ...candidate, blocks: withSequentialOrder(moveItem(candidate.blocks, from, to)) }
          : candidate,
      ),
    );
  }

  const sortedPages = [...pages].sort(
    (left, right) =>
      pageSlugOptions.findIndex((option) => option.value === left.slug) -
      pageSlugOptions.findIndex((option) => option.value === right.slug),
  );
  const activePage = sortedPages.find((page) => page.id === activePageId) ?? sortedPages[0] ?? null;
  const availableBlockOptions = activePage ? collectionBlockOptionsForPage(activePage.slug) : pageBlockTypeOptions;
  const pendingType = activePage ? pendingBlockTypes[activePage.id] : "richText";
  const selectedBlockType = availableBlockOptions.some((option) => option.value === pendingType)
    ? pendingType
    : (availableBlockOptions[0]?.value ?? "richText");

  function handlePageSelect(page: PageDocument) {
    setActivePageId(page.id);
    onActivePageSlugChange(page.slug);
    window.setTimeout(() => {
      activePageEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  useEffect(() => {
    if (!highlightedBlockId) {
      return;
    }

    const node = blockRefs.current[highlightedBlockId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const timeout = window.setTimeout(() => {
      setHighlightedBlockId(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [pages, highlightedBlockId]);

  return (
    <SectionCard
      sectionId="pages-builder"
      title="Page Builder"
      description="Edit one public page at a time, then reorder, add, remove, and style reusable sections without touching collection content."
    >
      <div className="space-y-6">
        <div id="page-builder-page-picker" className="grid scroll-mt-28 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {sortedPages.map((page) => {
            const isActive = activePage?.id === page.id;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => handlePageSelect(page)}
                className={`group flex cursor-pointer items-center justify-between gap-3 rounded-[1.25rem] border px-4 py-3 text-left shadow-sm transition-all duration-150 ease-out hover:scale-[1.01] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8d120e]/30 ${
                  isActive
                    ? "border-[#8d120e]/40 bg-[#fff4f3] text-[#5d0d0a] shadow-[0_4px_14px_rgba(141,18,14,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(141,18,14,0.16)]"
                    : "cursor-pointer border-black/10 bg-[#faf8f7] text-[#220707] hover:-translate-y-1 hover:border-[#8d120e]/40 hover:bg-white hover:shadow-[0_8px_22px_rgba(31,20,19,0.11)]"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-semibold uppercase tracking-[0.14em] transition-colors duration-100 ${isActive ? "text-[#8d120e]" : "group-hover:text-[#8d120e]"}`}>
                    {pageSlugOptions.find((option) => option.value === page.slug)?.label ?? page.slug}
                  </span>
                  <span className="mt-2 block text-xs text-[#7e5a53] transition-colors duration-100 group-hover:text-[#5d0d0a]">
                    {page.blocks.length} block(s)
                  </span>
                </span>
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition duration-150 ease-out ${
                  isActive
                    ? "rotate-90 border-[#8d120e]/20 bg-white text-[#8d120e] shadow-[0_8px_18px_rgba(141,18,14,0.10)]"
                    : "border-black/10 bg-white text-[#9b7771] group-hover:translate-x-0.5 group-hover:border-[#8d120e]/25 group-hover:text-[#8d120e]"
                }`}>
                  <ChevronRightIcon />
                </span>
              </button>
            );
          })}
        </div>
        {activePage ? (
          <article ref={activePageEditorRef} className="rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-4 scroll-mt-28">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                  Page Label
                </span>
                <input
                  value={activePage.title}
                  maxLength={80}
                  onChange={(event) =>
                    onChange(
                      pages.map((candidate) =>
                        candidate.id === activePage.id ? { ...candidate, title: event.target.value } : candidate,
                      ),
                    )
                }
                className={fieldControlClass}
                />
                <div className="mt-1 text-right text-[0.72rem] text-[#7e5a53]">
                  {activePage.title.length}/80
                </div>
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                  Page Summary
                </span>
                <textarea
                  value={activePage.summary ?? ""}
                  maxLength={200}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    onChange(
                      pages.map((candidate) =>
                        candidate.id === activePage.id ? { ...candidate, summary: event.target.value } : candidate,
                      ),
                    )
                  }
                  className={`${fieldControlClass} min-h-[5rem] resize-y`}
                />
                <div className="mt-1 text-right text-[0.72rem] text-[#7e5a53]">
                  {(activePage.summary ?? "").length}/200
                </div>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-[1.25rem] border border-dashed border-black/12 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#220707]">
                  {pageSlugOptions.find((option) => option.value === activePage.slug)?.label ?? activePage.slug}
                </p>
                <p className="mt-1 text-sm text-[#5c4743]">{activePage.blocks.length} block(s)</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={selectedBlockType}
                  onChange={(event) =>
                    setPendingBlockTypes((current) => ({ ...current, [activePage.id]: event.target.value }))
                  }
                  className={fieldControlClass}
                >
                  {availableBlockOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const nextBlock = {
                      ...createPageBlockTemplate(
                        selectedBlockType as PageBlock["type"],
                      ),
                      order: activePage.blocks.length + 1,
                    };

                    onChange(
                      pages.map((candidate) =>
                        candidate.id === activePage.id
                          ? {
                              ...candidate,
                              blocks: withSequentialOrder([...candidate.blocks, nextBlock]),
                            }
                          : candidate,
                      ),
                    );
                    onBlockEdited(nextBlock.id);
                    setExpandedBlockIds((current) => ({ ...current, [nextBlock.id]: true }));
                    setHighlightedBlockId(nextBlock.id);
                    fieldCallbacks.onNotice("success", "Block added successfully.");
                  }}
                  className={primaryButtonClass}
                >
                  Add Block
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {activePage.blocks.map((block, index) => {
                const fields = getPageBlockFields(block)
                  .map(toPageBuilderFieldConfig)
                  .map((field) =>
                    field.key === "source"
                      ? { ...field, options: collectionSourceOptionsForPage(activePage.slug) }
                      : field,
                  );
                const appearanceFields = getPageBlockAppearanceFields(block).map(toPageBuilderFieldConfig);
                const isDraggingThis =
                  blockDrag?.pageId === activePage.id && blockDrag.index === index;
                const isExpanded = expandedBlockIds[block.id] ?? (index === 0 || highlightedBlockId === block.id);

                return (
                  <article
                    key={block.id}
                    ref={(node) => {
                      blockRefs.current[block.id] = node;
                    }}
                    draggable
                    onDragStart={() => setBlockDrag({ pageId: activePage.id, index })}
                    onDragOver={(event) => {
                      if (blockDrag && blockDrag.pageId === activePage.id) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={() => {
                      if (!blockDrag || blockDrag.pageId !== activePage.id || blockDrag.index === index) {
                        return;
                      }
                      reorderBlocks(activePage.id, blockDrag.index, index);
                      fieldCallbacks.onNotice("success", "Block moved.");
                      setBlockDrag(null);
                    }}
                    onDragEnd={() => setBlockDrag(null)}
                    className={`rounded-[1.5rem] border bg-white p-5 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(31,20,19,0.08)] ${
                      highlightedBlockId === block.id
                        ? "border-[#8d120e]/35 ring-2 ring-[#8d120e]/15"
                        : isDraggingThis
                          ? "border-[#8d120e]/40 opacity-60"
                          : "border-black/10"
                    }`}
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={dragHandleClass}
                          role="img"
                          aria-label={`Drag to reorder block ${index + 1}`}
                          title="Drag to reorder"
                        >
                          <DragHandleIcon />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                            Block {index + 1} - {getPageBlockLabel(block)}
                          </p>
                          <h3 className="mt-2 truncate text-2xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                            {block.title || "Untitled section"}
                          </h3>
                        </div>
                      </div>
                      <div className={rowActionRailClass}>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedBlockIds((current) => ({ ...current, [block.id]: !isExpanded }));
                            fieldCallbacks.onNotice("info", isExpanded ? "Block collapsed." : "Editing block.");
                          }}
                          className={secondaryButtonClass}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? "Collapse" : "Edit"}
                        </button>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            if (index > 0) {
                              reorderBlocks(activePage.id, index, index - 1);
                              fieldCallbacks.onNotice("success", "Block moved up.");
                            }
                          }}
                          className={iconButtonClass}
                          aria-label={`Move block ${index + 1} up`}
                          title="Move up"
                        >
                          <ArrowUpIcon />
                        </button>
                        <button
                          type="button"
                          disabled={index >= activePage.blocks.length - 1}
                          onClick={() => {
                            if (index < activePage.blocks.length - 1) {
                              reorderBlocks(activePage.id, index, index + 1);
                              fieldCallbacks.onNotice("success", "Block moved down.");
                            }
                          }}
                          className={iconButtonClass}
                          aria-label={`Move block ${index + 1} down`}
                          title="Move down"
                        >
                          <ArrowDownIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(
                              pages.map((candidate) =>
                                candidate.id === activePage.id
                                  ? {
                                      ...candidate,
                                      blocks: withSequentialOrder(
                                        candidate.blocks.filter((_, blockIndex) => blockIndex !== index),
                                      ),
                                    }
                                  : candidate,
                              ),
                            );
                            fieldCallbacks.onNotice("success", "Block removed.");
                          }}
                          className={destructiveIconButtonClass}
                          aria-label={`Remove block ${index + 1}`}
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          {block.type === "collectionGrid" ? <CollectionGridNote block={block} /> : null}
                          {fields.map((field) => (
                            <label key={`${block.id}-${field.key}`} className={isWideField(field) ? "md:col-span-2" : ""}>
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                                {field.label}
                              </span>
                              {renderField(
                                block as unknown as Record<string, unknown>,
                                field,
                                (nextValue) => {
                                  onBlockEdited(block.id);
                                  onChange(
                                    pages.map((candidate) =>
                                      candidate.id === activePage.id
                                        ? {
                                            ...candidate,
                                            blocks: candidate.blocks.map((candidateBlock, blockIndex) =>
                                              blockIndex === index
                                                ? updatePageBlockField(candidateBlock, field.key, nextValue)
                                                : candidateBlock,
                                            ),
                                          }
                                        : candidate,
                                    ),
                                  );
                                },
                                fieldCallbacks,
                              )}
                            </label>
                          ))}
                        </div>

                        <div className="rounded-[1.25rem] border border-black/8 bg-[#faf8f7] p-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                              Section Appearance
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#6a433d]">
                              Choose from page-safe background, heading, shape, and card presets.
                            </p>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {appearanceFields.map((field) => (
                              <label key={`${block.id}-${field.key}`} className={isWideField(field) ? "md:col-span-2" : ""}>
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                                  {field.label}
                                </span>
                                {renderField(
                                  block as unknown as Record<string, unknown>,
                                  field,
                                  (nextValue) => {
                                    onBlockEdited(block.id);
                                    onChange(
                                      pages.map((candidate) =>
                                        candidate.id === activePage.id
                                          ? {
                                              ...candidate,
                                              blocks: candidate.blocks.map((candidateBlock, blockIndex) =>
                                                blockIndex === index
                                                  ? updatePageBlockField(candidateBlock, field.key, nextValue)
                                                  : candidateBlock,
                                              ),
                                            }
                                          : candidate,
                                      ),
                                    );
                                  },
                                  fieldCallbacks,
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </article>
        ) : null}
      </div>
    </SectionCard>
  );
}

function MediaLibrarySection({
  assets,
  onAssetUploaded,
  onNotice,
}: {
  assets: MediaAsset[];
  onAssetUploaded: (asset: MediaAsset) => void;
  onNotice: (tone: AdminNoticeTone, message: string) => void;
}) {
  return (
    <SectionCard
      sectionId="media-library"
      title="Media Library"
      description="Upload reusable images once, then apply them from any CMS image field. Files are optimized before storage and only URLs are saved into content records."
    >
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <div>
          <AdminImageGalleryField
            value={[]}
            onChange={() => {}}
            onNotice={onNotice}
            onAssetUploaded={onAssetUploaded}
            helpText="Upload images here for reuse across pages, events, promotions, and branding fields."
          />
        </div>

        <div>
          {assets.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-[#faf8f7] p-5 text-sm text-[#5c4743]">
              No media uploaded yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <article key={asset.id} className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#faf8f7]">
                  <div className="overflow-hidden border-b border-black/8 bg-white">
                    <Image
                      src={asset.url}
                      alt={asset.fileName}
                      width={1200}
                      height={900}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm font-semibold text-[#220707]">{asset.fileName}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#7e5a53]">
                      {asset.width} x {asset.height} • {Math.max(1, Math.round(asset.size / 1024))} KB
                    </p>
                    <p
                      className="mt-2 text-xs leading-6 text-[#6a433d]"
                      suppressHydrationWarning
                    >
                      Uploaded {new Date(asset.createdAt).toLocaleString()}
                    </p>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e] transition hover:opacity-75"
                    >
                      Open Asset
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// Route list and per-view anchor links were moved to `components/admin-sidebar.tsx`
// when the sidebar was promoted to `app/admin/layout.tsx`. The data stayed near
// the nav component so edits to one don't silently drift from the other.

const viewMeta: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "CMS Dashboard",
    title: "Marketing control room",
    description:
      "Preview, publish, and track pages, campaigns, careers, product content, and customer messages from one place.",
  },
  settings: {
    eyebrow: "Settings",
    title: "Branding, contact, and navigation",
    description:
      "Global brand assets, contact information, navigation, and platform configuration live here.",
  },
  pages: {
    eyebrow: "Pages",
    title: "Block-based page builder",
    description:
      "Public marketing pages are modeled as reusable blocks, with category storytelling and brand cards managed in the same editor route.",
  },
  events: {
    eyebrow: "Stories",
    title: "News, events, and awards",
    description:
      "Manage timely cards with dates, images, publishing status, and the story rows that appear on the public pages.",
  },
  promotions: {
    eyebrow: "Promotions",
    title: "Video-led campaign content",
    description:
      "Promotions stay first-class and store only hosted video URLs plus thumbnails. Marketing never has to upload video binaries to the app.",
  },
  careers: {
    eyebrow: "Careers",
    title: "Departments and open roles",
    description:
      "Career content stays separate from pages so hiring data can scale independently.",
  },
  media: {
    eyebrow: "Media",
    title: "Reusable uploaded assets",
    description:
      "Upload, optimize, and review images that can be reused throughout the CMS without pasting raw URLs.",
  },
};

export function AdminDashboard({
  initialContent,
  initialCatalog,
  messages,
  storageMode,
  initialMediaAssets,
  initialJobApplications,
  view,
  previewMode,
}: AdminDashboardProps) {
  const [draft, setDraft] = useState<RidemaxSiteContent>(initialContent);
  const [savedDraft, setSavedDraft] = useState<RidemaxSiteContent>(initialContent);
  const [draftCatalog, setDraftCatalog] = useState<ExternalProductCatalog>(initialCatalog);
  const [savedDraftCatalog, setSavedDraftCatalog] = useState<ExternalProductCatalog>(initialCatalog);
  const [inboxMessages, setInboxMessages] = useState<ContactMessage[]>(messages);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(initialMediaAssets);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>(initialJobApplications);
  const [archivingApplicationId, setArchivingApplicationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [revertingRevisionId, setRevertingRevisionId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeBuilderPageSlug, setActiveBuilderPageSlug] = useState<ContentPageSlug>("home");
  const [lastEditedBlockId, setLastEditedBlockId] = useState<string | null>(null);

  const departmentOptions = useMemo(
    () => draft.departments.map((department: Department) => ({ label: department.name, value: department.slug })),
    [draft.departments],
  );

  const socialPlatformOptions: { label: string; value: SocialPlatform }[] = [
    { label: "Facebook", value: "facebook" },
    { label: "Instagram", value: "instagram" },
    { label: "LinkedIn", value: "linkedin" },
    { label: "X", value: "x" },
    { label: "TikTok", value: "tiktok" },
    { label: "YouTube", value: "youtube" },
  ];

  const navigationItems = draft.navigation.map((item) => ({
    ...item,
    childrenText: toLinkPairs(item.children ?? []),
  })) as Record<string, unknown>[];

  const fieldCallbacks: FieldCallbacks = {
    onNotice(tone, message) {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    },
    onAssetUploaded(asset) {
      setMediaAssets((current) => [asset, ...current.filter((candidate) => candidate.id !== asset.id)]);
    },
  };

  // Storage mode is an operator-level concern (see Settings / platform health),
  // so we keep the dashboard metrics strip focused on editorial counts only.
  // Surfacing it here leaks platform internals into content editors and
  // pushes the card grid onto two rows on most screens. Ops still reads the
  // value via /api/health where it belongs.
  void storageMode;
  const metrics = [
    { label: "Pages", value: String(draft.pages.length) },
    { label: "Campaigns", value: String(draft.promotions.length) },
    { label: "Product Categories", value: String(draft.productCategories.length) },
    { label: "Open Roles", value: String(draft.jobs.filter((job) => job.published).length) },
    { label: "Events", value: String(draft.events.length) },
    { label: "Images", value: String(mediaAssets.length) },
  ];

  const canSave = view !== "overview" && view !== "media";
  const hasUnsavedChanges = draft !== savedDraft || draftCatalog !== savedDraftCatalog;
  const activeCatalogCategorySlug =
    view === "pages" && isEditableCatalogPageSlug(activeBuilderPageSlug)
      ? activeBuilderPageSlug
      : null;
  const activeCatalogCategory = activeCatalogCategorySlug
    ? readScopedCategory(draft.productCategories, activeCatalogCategorySlug)
    : null;
  const catalogEditingEnabled = draft.catalogSource.mode === "local-json";
  const activeScopedBrands = activeCatalogCategorySlug
    ? scopedBrands(draft.brands, activeCatalogCategorySlug)
    : [];
  const activeBrandSelectOptions = activeScopedBrands.map((brand) => ({
    label: brand.label || brand.title || brand.slug,
    value: brand.label || brand.title || brand.slug,
  }));
  const activeScopedProductItems = activeCatalogCategorySlug
    ? scopedProductItems(draftCatalog, activeCatalogCategorySlug)
    : [];

  async function handleSave() {
    setSaving(true);
    setSaveState("saving");

    try {
      const nextCatalog = syncCatalogSnapshot(draft, draftCatalog);
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to save the content bundle.");
        setSaveState("error");
        return;
      }

      const catalogResponse = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextCatalog),
      });
      const catalogPayload = (await catalogResponse.json()) as { error?: string; message?: string };

      if (!catalogResponse.ok) {
        fieldCallbacks.onNotice("error", catalogPayload.error ?? "Unable to save the product catalog.");
        setSaveState("error");
        return;
      }

      setSavedDraft(draft);
      setDraftCatalog(nextCatalog);
      setSavedDraftCatalog(nextCatalog);
      setLastSavedAt(new Date().toISOString());
      setSaveState("success");
      fieldCallbacks.onNotice("success", `${payload.message ?? "Draft saved."} Catalog draft saved.`);
    } catch {
      setSaveState("error");
      fieldCallbacks.onNotice("error", "Unable to save the content bundle and product catalog.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);

    try {
      const response = await fetch("/api/admin/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          catalog: syncCatalogSnapshot(draft, draftCatalog),
          content: draft,
          path:
            view === "pages"
              ? `${publicPathForPageSlug(activeBuilderPageSlug)}${
                  lastEditedBlockId ? `#section-${encodeURIComponent(lastEditedBlockId)}` : ""
                }`
              : view === "events"
              ? "/events"
              : view === "promotions"
                ? "/promotions"
                : view === "careers"
                  ? "/careers"
                  : "/",
        }),
      });

      const payload = (await response.json()) as { error?: string; previewUrl?: string };

      if (!response.ok || !payload.previewUrl) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to open preview.");
        return;
      }

      window.open(payload.previewUrl, "_blank", "noopener,noreferrer");
      fieldCallbacks.onNotice("success", "Preview opened in a new tab.");
    } catch {
      fieldCallbacks.onNotice("error", "Unable to open preview.");
    } finally {
      setPreviewing(false);
    }
  }

  async function loadRevisions() {
    setRevisionsLoading(true);

    try {
      const response = await fetch("/api/admin/revisions", { cache: "no-store" });
      const payload = (await response.json()) as {
        revisions?: RevisionEntry[];
        error?: string;
      };

      if (!response.ok) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to load revisions.");
        return;
      }

      setRevisions(payload.revisions ?? []);
    } catch {
      fieldCallbacks.onNotice("error", "Unable to load revisions.");
    } finally {
      setRevisionsLoading(false);
    }
  }

  function handleOpenRevisions() {
    setRevisionsOpen(true);
    void loadRevisions();
  }

  async function handlePublish() {
    if (hasUnsavedChanges) {
      fieldCallbacks.onNotice("error", "Save the draft before publishing.");
      return;
    }

    setPublishing(true);

    try {
      const response = await fetch("/api/admin/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: "Manual publish from admin." }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to publish.");
        return;
      }

      setSaveState("published");
      setLastSavedAt(new Date().toISOString());
      fieldCallbacks.onNotice("success", payload.message ?? "Published.");
      if (revisionsOpen) {
        void loadRevisions();
      }
    } catch {
      fieldCallbacks.onNotice("error", "Unable to publish.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleRevertRevision(revisionId: string) {
    setRevertingRevisionId(revisionId);

    try {
      const response = await fetch(`/api/admin/revisions/${revisionId}/revert`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        content?: RidemaxSiteContent;
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.content) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to restore revision.");
        return;
      }

      setDraft(payload.content);
      setSavedDraft(payload.content);
      setLastSavedAt(new Date().toISOString());
      setSaveState("success");
      setRevisionsOpen(false);
      fieldCallbacks.onNotice(
        "success",
        payload.message ?? "Revision copied into draft. Preview and publish when ready.",
      );
    } catch {
      fieldCallbacks.onNotice("error", "Unable to restore revision.");
    } finally {
      setRevertingRevisionId(null);
    }
  }

  async function handleArchiveMessage(messageId: string) {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/archive`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to archive message.");
        return;
      }

      setInboxMessages((current) => current.filter((message) => message.id !== messageId));
      fieldCallbacks.onNotice("success", payload.message ?? "Message archived.");
    } catch {
      fieldCallbacks.onNotice("error", "Unable to archive message.");
    }
  }

  async function handleArchiveApplication(applicationId: string) {
    setArchivingApplicationId(applicationId);
    try {
      const response = await fetch(`/api/admin/job-applications/${applicationId}/archive`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        fieldCallbacks.onNotice("error", payload.error ?? "Unable to archive application.");
        return;
      }

      setJobApplications((current) => current.filter((application) => application.id !== applicationId));
      fieldCallbacks.onNotice("success", payload.message ?? "Application archived.");
    } catch {
      fieldCallbacks.onNotice("error", "Unable to archive application.");
    } finally {
      setArchivingApplicationId(null);
    }
  }

  // The persistent sidebar + outer grid live in `app/admin/layout.tsx`. This
  // component owns only the per-view content stack and the in-view toast feed.
  return (
    <>
      <ToastStack toasts={toasts} />
      <SaveActionBar
        canSave={canSave}
        dirty={hasUnsavedChanges}
        saving={saving}
        previewing={previewing}
        publishing={publishing}
        saveState={saveState}
        lastSavedAt={lastSavedAt}
        previewMode={previewMode}
        onSave={handleSave}
        onPreview={handlePreview}
        onPublish={handlePublish}
        onOpenRevisions={handleOpenRevisions}
      />
      <RevisionsDrawer
        open={revisionsOpen}
        loading={revisionsLoading}
        revisions={revisions}
        reverting={revertingRevisionId}
        onClose={() => setRevisionsOpen(false)}
        onRevert={handleRevertRevision}
      />
      <div className={`space-y-8 ${canSave ? "pb-28" : ""}`}>
          <section className="rounded-[2rem] border border-black/10 bg-white p-7 shadow-[0_16px_40px_rgba(28,20,19,0.06)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#6a433d]">{viewMeta[view].eyebrow}</p>
                <h1 className="mt-3 text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                  {viewMeta[view].title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c4743]">
                  {viewMeta[view].description}
                </p>
              </div>

              {previewMode ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[#8d120e]/20 bg-[#fff4f3] px-4 py-2 text-sm font-semibold text-[#8d120e]">
                    Preview mode is active
                  </span>
                  <a href="/api/admin/preview/disable?path=/admin" className={secondaryButtonClass}>
                    Exit Preview
                  </a>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.5rem] bg-[#f7f2f1] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-[#7e5a53]">{metric.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-[#220707]">{metric.value}</div>
                </div>
              ))}
            </div>
          </section>

          {view === "overview" ? (
            <>
              <SectionCard
                sectionId="inbox"
                title="Inbox"
                description="Messages submitted from the contact form land here."
              >
                <div className="space-y-4">
                  {inboxMessages.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-[#faf8f7] p-5 text-sm text-[#5c4743]">
                      No messages yet.
                    </div>
                  ) : (
                    inboxMessages.map((message) => (
                      <article key={message.id} className="rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-[#220707]">
                              {message.firstName} {message.lastName}
                            </h3>
                            <p className="text-sm text-[#5c4743]">{message.email}</p>
                          </div>
                          <p
                            className="text-xs uppercase tracking-[0.14em] text-[#7e5a53]"
                            suppressHydrationWarning
                          >
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#412f2b]">{message.message}</p>
                        <div className="mt-4 border-t border-black/8 pt-4">
                          <button
                            type="button"
                            onClick={() => handleArchiveMessage(message.id)}
                            className={secondaryButtonClass}
                          >
                            Archive
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </SectionCard>
            </>
          ) : null}

          {view === "settings" ? (
            <>
              <SingletonSection
                sectionId="settings-site"
                title="Site Settings"
                description="Global branding, footer copy, contact details, and catalog source configuration."
                value={{
                  ...draft.site,
                  ...draft.contact,
                  ...draft.catalogSource,
                  notesText: toLineList(draft.catalogSource.notes),
                }}
                fields={[
                  { key: "siteName", label: "Site Name", type: "text" },
                  { key: "logoSrc", label: "Logo (light surfaces)", type: "image" },
                  { key: "logoLightSrc", label: "Logo (dark surfaces)", type: "image" },
                  { key: "searchPlaceholder", label: "Search Placeholder", type: "text" },
                  { key: "footerDescription", label: "Footer Description", type: "textarea" },
                  { key: "address", label: "Address", type: "text" },
                  { key: "phone", label: "Phone", type: "text" },
                  { key: "email", label: "Email", type: "text" },
                  { key: "mapQuery", label: "Map Query", type: "text" },
                  { key: "mapZoom", label: "Map Zoom", type: "text", parse: (value) => parseNumber(value, 15) },
                  { key: "intro", label: "Contact Intro", type: "textarea" },
                  {
                    key: "mode",
                    label: "Catalog Mode",
                    type: "select",
                    options: [
                      { label: "Local JSON", value: "local-json" },
                      { label: "Remote API", value: "remote-api" },
                    ],
                  },
                  { key: "provider", label: "Catalog Provider", type: "text" },
                  { key: "endpoint", label: "Catalog Endpoint", type: "text" },
                  // Intentionally NOT exposing `readOnly`. It is a type-level
                  // invariant (`CatalogSourceSettings.readOnly: true`). Admin
                  // edits must never flip the catalog to write mode; if we
                  // ever want that, it belongs in a separate role-gated flow.
                  {
                    key: "syncStrategy",
                    label: "Sync Strategy",
                    type: "select",
                    options: [
                      { label: "API-based ingestion", value: "api-based-ingestion" },
                      { label: "Scheduled sync", value: "scheduled-sync" },
                      { label: "Queue worker", value: "queue-worker" },
                    ],
                  },
                  { key: "fallbackPath", label: "Fallback Path", type: "text" },
                  { key: "notesText", label: "Catalog Notes (one per line)", type: "textarea", parse: fromLineList },
                ]}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    site: {
                      siteName: String(value.siteName ?? ""),
                      logoSrc: String(value.logoSrc ?? ""),
                      logoLightSrc: String(value.logoLightSrc ?? ""),
                      searchPlaceholder: String(value.searchPlaceholder ?? ""),
                      footerDescription: String(value.footerDescription ?? ""),
                    },
                    contact: {
                      address: String(value.address ?? ""),
                      phone: String(value.phone ?? ""),
                      email: String(value.email ?? ""),
                      mapQuery: String(value.mapQuery ?? ""),
                      mapZoom: parseNumber(value.mapZoom, 15),
                      intro: String(value.intro ?? ""),
                      socials: current.contact.socials,
                      shops: current.contact.shops,
                    },
                    catalogSource: {
                      mode: String(value.mode ?? "local-json") as RidemaxSiteContent["catalogSource"]["mode"],
                      provider: String(value.provider ?? ""),
                      endpoint: String(value.endpoint ?? ""),
                      // Type-level invariant, not an admin-configurable flag.
                      readOnly: true,
                      syncStrategy: String(value.syncStrategy ?? "api-based-ingestion") as RidemaxSiteContent["catalogSource"]["syncStrategy"],
                      lastSyncedAt: current.catalogSource.lastSyncedAt,
                      fallbackPath: String(value.fallbackPath ?? ""),
                      notes: Array.isArray(value.notesText) ? value.notesText.map(String) : current.catalogSource.notes,
                    },
                  }))
                }
                fieldCallbacks={fieldCallbacks}
              />

              <CollectionSection
                sectionId="settings-navigation"
                title="Navigation"
                description="Header navigation with dropdown children."
                items={navigationItems}
                template={{ label: "", href: "", childrenText: "", order: draft.navigation.length + 1 }}
                fields={[
                  { key: "label", label: "Label", type: "text" },
                  { key: "href", label: "Href", type: "text" },
                  { key: "childrenText", label: "Children (Label | /path per line)", type: "textarea" },
                ]}
                onChange={(items) =>
                  setDraft((current) => ({
                    ...current,
                    navigation: items.map((item) => ({
                      label: String(item.label ?? ""),
                      href: String(item.href ?? ""),
                      children: fromLinkPairs(item.childrenText),
                    })),
                  }))
                }
                fieldCallbacks={fieldCallbacks}
              />

              <CollectionSection
                sectionId="settings-social"
                title="Social Links"
                description="Global social links used by contact blocks and the footer."
                items={draft.contact.socials as unknown as Record<string, unknown>[]}
                template={{
                  platform: "facebook",
                  label: "Facebook",
                  href: "https://facebook.com",
                  order: draft.contact.socials.length + 1,
                }}
                fields={[
                  { key: "platform", label: "Platform", type: "select", options: socialPlatformOptions },
                  { key: "label", label: "Label", type: "text" },
                  { key: "href", label: "URL", type: "text" },
                ]}
                onChange={(items) =>
                  setDraft((current) => ({
                    ...current,
                    contact: {
                      ...current.contact,
                      socials: items.map((item) => ({
                        platform: String(item.platform ?? "facebook") as SocialPlatform,
                        label: String(item.label ?? ""),
                        href: String(item.href ?? ""),
                      })),
                    },
                  }))
                }
                fieldCallbacks={fieldCallbacks}
              />

              <CollectionSection
                title="Shop Links"
                description="Footer and contact surface links for external shops."
                items={draft.contact.shops as unknown as Record<string, unknown>[]}
                template={{ label: "Shopee", href: "https://shopee.ph", order: draft.contact.shops.length + 1 }}
                fields={[
                  { key: "label", label: "Label", type: "text" },
                  { key: "href", label: "URL", type: "text" },
                ]}
                onChange={(items) =>
                  setDraft((current) => ({
                    ...current,
                    contact: {
                      ...current.contact,
                      shops: items.map((item) => ({
                        label: String(item.label ?? ""),
                        href: String(item.href ?? ""),
                      })),
                    },
                  }))
                }
                fieldCallbacks={fieldCallbacks}
              />
            </>
          ) : null}

          {view === "pages" ? (
            <>
              <PageBuilderSection
                pages={draft.pages}
                onChange={(pages) => setDraft((current) => ({ ...current, pages }))}
                fieldCallbacks={fieldCallbacks}
                activePageSlug={activeBuilderPageSlug}
                onActivePageSlugChange={setActiveBuilderPageSlug}
                onBlockEdited={setLastEditedBlockId}
              />

              {activeCatalogCategorySlug && activeCatalogCategory ? (
                <>
                  <SingletonSection
                    sectionId="pages-catalog"
                    title={`${labelForCategorySlug(activeCatalogCategorySlug)} Category Page`}
                    description="Edit the public category route metadata that wraps the brand list, product results, and detail rows."
                    value={activeCatalogCategory as unknown as Record<string, unknown>}
                    fields={[
                      { key: "name", label: "Category Name", type: "text" },
                      { key: "description", label: "Category Description", type: "textarea" },
                      { key: "heroTitle", label: "Hero Title", type: "text" },
                      { key: "heroSummary", label: "Hero Summary", type: "textarea" },
                      { key: "heroImage.src", label: "Hero Image", type: "image" },
                      { key: "heroImage.alt", label: "Hero Image Alt", type: "text" },
                      { key: "featuredImage", label: "Category Card Image", type: "image" },
                      { key: "browseTitle", label: "Products Heading", type: "text" },
                      { key: "browseSummary", label: "Products Intro", type: "textarea" },
                      { key: "sectionTitle", label: "Detail Rows Heading", type: "text" },
                      { key: "sectionSummary", label: "Detail Rows Intro", type: "textarea" },
                    ]}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        productCategories: upsertScopedCategory(
                          current.productCategories,
                          activeCatalogCategorySlug,
                          {
                            ...activeCatalogCategory,
                            name: String(value.name ?? ""),
                            description: String(value.description ?? ""),
                            heroTitle: String(value.heroTitle ?? ""),
                            heroSummary: String(value.heroSummary ?? ""),
                            heroImage: {
                              src: String(readValue(value, "heroImage.src") ?? ""),
                              alt: String(readValue(value, "heroImage.alt") ?? ""),
                            },
                            featuredImage: String(value.featuredImage ?? ""),
                            browseTitle: String(value.browseTitle ?? ""),
                            browseSummary: String(value.browseSummary ?? ""),
                            sectionTitle: String(value.sectionTitle ?? ""),
                            sectionSummary: String(value.sectionSummary ?? ""),
                          },
                        ),
                      }))
                    }
                    fieldCallbacks={fieldCallbacks}
                  />

                  <CollectionSection
                    sectionId="pages-category-sections"
                    title={`${labelForCategorySlug(activeCatalogCategorySlug)} Detail Rows`}
                    description="Rows rendered near the bottom of the category route. Use them for tire types, wheel styles, accessory groups, and other page-specific guidance."
                    items={activeCatalogCategory.sections as unknown as Record<string, unknown>[]}
                    template={{
                      id: `section-${activeCatalogCategorySlug}-${Date.now()}`,
                      slug: "",
                      title: "",
                      subtitle: "",
                      image: "",
                      imageAlt: "",
                      paragraphs: [],
                      published: true,
                      order: activeCatalogCategory.sections.length + 1,
                    }}
                    fields={[
                      { key: "id", label: "ID", type: "text" },
                      { key: "slug", label: "Slug", type: "text" },
                      { key: "title", label: "Title", type: "text" },
                      { key: "subtitle", label: "Subtitle", type: "text" },
                      { key: "image", label: "Image", type: "image" },
                      { key: "imageAlt", label: "Image Alt", type: "text" },
                      { key: "paragraphs", label: "Paragraphs (one per line)", type: "textarea", parse: fromLineList },
                      { key: "published", label: "Published", type: "checkbox" },
                    ]}
                    onChange={(items) =>
                      setDraft((current) => {
                        const currentCategory = readScopedCategory(current.productCategories, activeCatalogCategorySlug);
                        return {
                          ...current,
                          productCategories: upsertScopedCategory(
                            current.productCategories,
                            activeCatalogCategorySlug,
                            {
                              ...currentCategory,
                              sections: normalizeCategorySections(items),
                            },
                          ),
                        };
                      })
                    }
                    fieldCallbacks={fieldCallbacks}
                    addLabel="Add Row"
                    itemLabel="Detail Row"
                  />

                  <CollectionSection
                    sectionId="pages-brands"
                    title={`${labelForCategorySlug(activeCatalogCategorySlug)} Brands`}
                    description="Brand cards feed the category grid. Add products below and choose one of these brand names so the public See More page fills in."
                    items={activeScopedBrands as unknown as Record<string, unknown>[]}
                    template={{
                      id: `brand-${activeCatalogCategorySlug}-${Date.now()}`,
                      slug: "",
                      label: "",
                      title: "",
                      summary: "",
                      image: "",
                      href: `/products/${activeCatalogCategorySlug}?brand=`,
                      categorySlug: activeCatalogCategorySlug,
                      tags: [],
                      published: true,
                      order: activeScopedBrands.length + 1,
                    }}
                    fields={[
                      { key: "id", label: "ID", type: "text" },
                      { key: "slug", label: "Slug", type: "text" },
                      { key: "label", label: "Label", type: "text" },
                      { key: "title", label: "Title", type: "text" },
                      { key: "summary", label: "Summary", type: "textarea" },
                      { key: "image", label: "Brand Image", type: "image" },
                      { key: "tags", label: "Tags (one per line)", type: "textarea", parse: fromLineList },
                      { key: "published", label: "Published", type: "checkbox" },
                    ]}
                    onChange={(items) =>
                      setDraft((current) => ({
                        ...current,
                        brands: mergeScopedBrands(current.brands, activeCatalogCategorySlug, items),
                      }))
                    }
                    fieldCallbacks={fieldCallbacks}
                    addLabel="Add Brand"
                    itemLabel={`${labelForCategorySlug(activeCatalogCategorySlug)} Brand`}
                  />

                  {catalogEditingEnabled ? (
                    <CollectionSection
                      sectionId="pages-catalog-items"
                      title={`${labelForCategorySlug(activeCatalogCategorySlug)} Products by Brand`}
                      description="Add products for the brands on this page. Choose the Brand from the dropdown so each brand card knows which products to show."
                      items={activeScopedProductItems as unknown as Record<string, unknown>[]}
                      template={{
                        id: `product-${activeCatalogCategorySlug}-${Date.now()}`,
                        slug: "",
                        categorySlug: activeCatalogCategorySlug,
                        brand: activeBrandSelectOptions[0]?.value ?? "",
                        title: "",
                        summary: "",
                        description: "",
                        highlights: [],
                        image: "",
                        gallery: [],
                        sizes: [],
                        tags: [],
                        searchKeywords: [],
                        published: true,
                        order: activeScopedProductItems.length + 1,
                      }}
                      fields={[
                        { key: "id", label: "ID", type: "text" },
                        { key: "slug", label: "Slug", type: "text" },
                        activeBrandSelectOptions.length > 0
                          ? { key: "brand", label: "Brand", type: "select", options: activeBrandSelectOptions }
                          : { key: "brand", label: "Brand", type: "text" },
                        { key: "title", label: "Title", type: "text" },
                        { key: "summary", label: "Summary", type: "textarea" },
                        { key: "description", label: "Description", type: "textarea" },
                        { key: "highlights", label: "Highlights (one per line)", type: "textarea", parse: fromLineList },
                        { key: "image", label: "Primary Image", type: "image" },
                        { key: "gallery", label: "Gallery", type: "image-list" },
                        { key: "sizes", label: "Sizes (one per line)", type: "textarea", parse: fromLineList },
                        { key: "tags", label: "Tags (one per line)", type: "textarea", parse: fromLineList },
                        { key: "searchKeywords", label: "Search Keywords (one per line)", type: "textarea", parse: fromLineList },
                        { key: "published", label: "Published", type: "checkbox" },
                      ]}
                      onChange={(items) =>
                        setDraftCatalog((current) =>
                          mergeScopedProductItems(current, activeCatalogCategorySlug, items),
                        )
                      }
                      fieldCallbacks={fieldCallbacks}
                      addLabel={activeCatalogCategorySlug === "tires" ? "Add Tire" : "Add Product"}
                      itemLabel={`${labelForCategorySlug(activeCatalogCategorySlug)} Product`}
                    />
                  ) : (
                    <SectionCard
                      sectionId="pages-catalog-items"
                      title={`${labelForCategorySlug(activeCatalogCategorySlug)} Products`}
                      description="Product item editing is paused because Catalog Mode is Remote API. Keep product changes upstream, then sync them back into the snapshot."
                    >
                      <div className="rounded-[1.25rem] border border-dashed border-black/12 bg-[#faf8f7] p-5 text-sm leading-7 text-[#5c4743]">
                        Switch Catalog Mode to Local JSON in Settings if this site should stage product rows directly for now.
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : null}
            </>
          ) : null}

          {view === "promotions" ? (
            <CollectionSection
              sectionId="content-promotions"
              title="Promotions"
              description="Video-led promotions with hosted URLs only. Use image upload for thumbnails, but keep videos on YouTube or Vimeo."
              items={draft.promotions as unknown as Record<string, unknown>[]}
              template={{
                id: "",
                slug: "",
                title: "",
                summary: "",
                description: "",
                videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
                thumbnail: "",
                publishDate: new Date().toISOString(),
                ctaLabel: "",
                ctaHref: "",
                tags: [],
                published: true,
                featured: false,
                order: draft.promotions.length + 1,
              }}
              fields={[
                { key: "id", label: "ID", type: "text" },
                { key: "slug", label: "Slug", type: "text" },
                { key: "title", label: "Title", type: "text" },
                { key: "summary", label: "Summary", type: "textarea" },
                { key: "description", label: "Description", type: "textarea" },
                { key: "videoUrl", label: "YouTube/Vimeo URL", type: "text" },
                { key: "thumbnail", label: "Thumbnail", type: "image" },
                { key: "publishDate", label: "Publish Date", type: "datetime" },
                { key: "ctaLabel", label: "CTA Label", type: "text" },
                { key: "ctaHref", label: "CTA Link", type: "text" },
                { key: "tags", label: "Tags (one per line)", type: "textarea", parse: fromLineList },
                { key: "featured", label: "Featured", type: "checkbox" },
                { key: "published", label: "Published", type: "checkbox" },
              ]}
              onChange={(items) =>
                setDraft((current) => ({ ...current, promotions: items as RidemaxSiteContent["promotions"] }))
              }
              fieldCallbacks={fieldCallbacks}
              itemLabel="Promotion"
            />
          ) : null}

          {view === "careers" ? (
            <>
              <SectionCard
                sectionId="careers-applications"
                title="Applications Inbox"
                description="Submissions from the public job application form. Archive rows after you hand them to the hiring team."
              >
                <div className="space-y-4">
                  {jobApplications.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-[#faf8f7] p-5 text-sm text-[#5c4743]">
                      No applications yet.
                    </div>
                  ) : (
                    jobApplications.map((application) => (
                      <article
                        key={application.id}
                        className="rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-[#220707]">{application.fullName}</h3>
                            <p className="text-sm text-[#5c4743]">
                              {application.email}
                              {application.phone ? ` · ${application.phone}` : ""}
                            </p>
                            {application.jobTitle ? (
                              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#8d120e]">
                                Applied for {application.jobTitle}
                              </p>
                            ) : null}
                          </div>
                          <p
                            className="text-xs uppercase tracking-[0.14em] text-[#7e5a53]"
                            suppressHydrationWarning
                          >
                            {new Date(application.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {application.message ? (
                          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#412f2b]">
                            {application.message}
                          </p>
                        ) : null}
                        {application.resumeUrl ? (
                          <p className="mt-3 text-sm">
                            <a
                              href={application.resumeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[#8d120e] underline underline-offset-2 hover:text-[#a51611]"
                            >
                              Open resume link
                            </a>
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-3 border-t border-black/8 pt-4">
                          <a
                            href={`mailto:${application.email}?subject=${encodeURIComponent(
                              `Re: ${application.jobTitle || "your application"}`,
                            )}`}
                            className={secondaryButtonClass}
                          >
                            Reply by email
                          </a>
                          <button
                            type="button"
                            onClick={() => handleArchiveApplication(application.id)}
                            disabled={archivingApplicationId === application.id}
                            className={secondaryButtonClass}
                          >
                            {archivingApplicationId === application.id ? "Archiving…" : "Archive"}
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </SectionCard>

              <CollectionSection
                sectionId="careers-departments"
                title="Departments"
                description="Departments feed the careers filtering UI and admin job assignment."
                items={draft.departments as unknown as Record<string, unknown>[]}
                template={{ id: "", slug: "", name: "", published: true, order: draft.departments.length + 1 }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "name", label: "Department Name", type: "text" },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) => setDraft((current) => ({ ...current, departments: items as Department[] }))}
                fieldCallbacks={fieldCallbacks}
                itemLabel="Department"
              />

              <CollectionSection
                sectionId="careers-jobs"
                title="Jobs"
                description="Career openings remain a first-class collection and are surfaced through the jobs list block."
                items={draft.jobs as unknown as Record<string, unknown>[]}
                template={{
                  id: "",
                  slug: "",
                  departmentSlug: departmentOptions[0]?.value ?? "",
                  title: "",
                  location: "",
                  type: "Full Time",
                  summary: "",
                  description: "",
                  published: true,
                  featured: false,
                  order: draft.jobs.length + 1,
                }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "departmentSlug", label: "Department", type: "select", options: departmentOptions },
                  { key: "title", label: "Title", type: "text" },
                  { key: "location", label: "Location", type: "text" },
                  { key: "type", label: "Type", type: "text" },
                  { key: "summary", label: "Summary", type: "textarea" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "featured", label: "Featured", type: "checkbox" },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) => setDraft((current) => ({ ...current, jobs: items as RidemaxSiteContent["jobs"] }))}
                fieldCallbacks={fieldCallbacks}
                itemLabel="Job"
              />
            </>
          ) : null}

          {view === "events" ? (
            <>
              <CollectionSection
                sectionId="content-news"
                title="News"
                description="News cards can appear on multiple pages through collection blocks."
                items={draft.newsItems as unknown as Record<string, unknown>[]}
                template={{
                  id: "",
                  slug: "",
                  title: "",
                  excerpt: "",
                  summary: "",
                  image: "",
                  published: true,
                  featured: false,
                  order: draft.newsItems.length + 1,
                }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "excerpt", label: "Excerpt", type: "textarea" },
                  { key: "summary", label: "Summary", type: "textarea" },
                  { key: "image", label: "Image", type: "image" },
                  { key: "featured", label: "Featured", type: "checkbox" },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) =>
                  setDraft((current) => ({ ...current, newsItems: items as RidemaxSiteContent["newsItems"] }))
                }
                fieldCallbacks={fieldCallbacks}
                itemLabel="News Item"
                addLabel="Add News"
              />

              <CollectionSection
                sectionId="content-events"
                title="Events"
                description="Events keep their own schema and can be reused across the Events page, homepage, and search."
                items={draft.events as unknown as Record<string, unknown>[]}
                template={{
                  id: "",
                  slug: "",
                  title: "",
                  teaserDate: "",
                  location: "",
                  venue: "",
                  startAt: new Date().toISOString(),
                  endAt: new Date().toISOString(),
                  summary: "",
                  description: "",
                  image: "",
                  detailImage: "",
                  published: true,
                  featured: false,
                  order: draft.events.length + 1,
                  shareLinks: { facebook: "", x: "", linkedin: "" },
                }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "teaserDate", label: "Teaser Date", type: "text" },
                  { key: "location", label: "Location", type: "text" },
                  { key: "venue", label: "Venue", type: "text" },
                  { key: "startAt", label: "Start Date", type: "datetime" },
                  { key: "endAt", label: "End Date", type: "datetime" },
                  { key: "summary", label: "Summary", type: "textarea" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "image", label: "Card Image", type: "image" },
                  { key: "detailImage", label: "Detail Image", type: "image" },
                  { key: "shareLinks.facebook", label: "Facebook URL", type: "text" },
                  { key: "shareLinks.x", label: "X URL", type: "text" },
                  { key: "shareLinks.linkedin", label: "LinkedIn URL", type: "text" },
                  { key: "featured", label: "Featured", type: "checkbox" },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) => setDraft((current) => ({ ...current, events: items as RidemaxSiteContent["events"] }))}
                fieldCallbacks={fieldCallbacks}
                itemLabel="Event"
                addLabel="Add Event"
              />

              <CollectionSection
                sectionId="content-awards"
                title="Awards"
                description="Awards stay independent from events and can be surfaced wherever a collection grid needs them."
                items={draft.awards as unknown as Record<string, unknown>[]}
                template={{
                  id: "",
                  slug: "",
                  year: "",
                  title: "",
                  summary: "",
                  image: "",
                  published: true,
                  order: draft.awards.length + 1,
                }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "year", label: "Year", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "summary", label: "Summary", type: "textarea" },
                  { key: "image", label: "Image", type: "image" },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) => setDraft((current) => ({ ...current, awards: items as RidemaxSiteContent["awards"] }))}
                fieldCallbacks={fieldCallbacks}
                itemLabel="Award"
                addLabel="Add Award"
              />

              <CollectionSection
                sectionId="content-projects"
                title="Project Features"
                description="Alternating rows for the combined Events and Awards landing page."
                items={draft.projectFeatures as unknown as Record<string, unknown>[]}
                template={{
                  id: "",
                  numberLabel: "05",
                  title: "",
                  summary: "",
                  image: "",
                  href: "/events",
                  published: true,
                  order: draft.projectFeatures.length + 1,
                }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "numberLabel", label: "Number Label", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "summary", label: "Summary", type: "textarea" },
                  { key: "image", label: "Image", type: "image" },
                  { key: "href", label: "Link", type: "text" },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) =>
                  setDraft((current) => ({ ...current, projectFeatures: items as RidemaxSiteContent["projectFeatures"] }))
                }
                fieldCallbacks={fieldCallbacks}
                itemLabel="Project Feature"
                addLabel="Add Highlight"
              />
            </>
          ) : null}

          {view === "media" ? (
            <MediaLibrarySection
              assets={mediaAssets}
              onAssetUploaded={fieldCallbacks.onAssetUploaded}
              onNotice={fieldCallbacks.onNotice}
            />
          ) : null}
      </div>
    </>
  );
}
