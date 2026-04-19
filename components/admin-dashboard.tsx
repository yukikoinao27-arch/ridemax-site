"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminImageGalleryField,
  AdminImageUploadField,
  type AdminNoticeTone,
} from "@/components/admin-media-fields";
import {
  createPageBlockTemplate,
  getPageBlockFields,
  getPageBlockLabel,
  pageBlockTypeOptions,
  pageSlugOptions,
  type SelectOption,
} from "@/lib/page-builder";
import type {
  ContactMessage,
  Department,
  MediaAsset,
  PageBlock,
  PageDocument,
  ProductCategory,
  RidemaxSiteContent,
  SocialPlatform,
} from "@/lib/ridemax-types";

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
  messages: ContactMessage[];
  storageMode: string;
  initialMediaAssets: MediaAsset[];
  view: AdminView;
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
};

type ToastMessage = {
  id: number;
  tone: AdminNoticeTone;
  message: string;
};

type FieldCallbacks = {
  onNotice: (tone: AdminNoticeTone, message: string) => void;
  onAssetUploaded: (asset: MediaAsset) => void;
};

const primaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[#8d120e] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#a51611] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryButtonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm font-semibold text-[#220707] transition hover:-translate-y-0.5 hover:bg-[#f7f2f1] disabled:cursor-not-allowed disabled:opacity-70";
const tertiaryButtonClass =
  "rounded-full border border-black/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#220707] transition hover:-translate-y-0.5 hover:bg-white";

// Compact circular icon button used for reorder / remove controls on list items
// and page blocks. The visual language matches the sidebar icons: 36×36 circle,
// border, subtle hover lift. Disabled buttons lose the hover lift and fade out
// so "can't move up any further" is obvious without surfacing new error UX.
const iconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-[#220707] transition hover:-translate-y-0.5 hover:bg-[#f7f2f1] disabled:pointer-events-none disabled:opacity-40";
const destructiveIconButtonClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#8d120e]/30 bg-white text-[#8d120e] transition hover:-translate-y-0.5 hover:bg-[#fff4f3] disabled:pointer-events-none disabled:opacity-40";
const dragHandleClass =
  "inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-black/10 bg-white text-[#6a433d] transition hover:-translate-y-0.5 hover:bg-[#f7f2f1] active:cursor-grabbing";

// Lightweight inline SVG icons. Kept local to avoid pulling in an icon library
// for three glyphs — the admin surface is tightly controlled and already ships
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

  return String(value ?? "");
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

function renderField(
  item: Record<string, unknown>,
  field: FieldConfig,
  onChange: (value: unknown) => void,
  callbacks: FieldCallbacks,
) {
  const rawValue = readValue(item, field.key);
  const value = displayFieldValue(item, field);

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
      <textarea
        value={String(value)}
        onChange={(event) => onChange(normalizeFieldValue(field, event.target.value))}
        className="mt-2 w-full rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
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
      <select
        value={String(value)}
        onChange={(event) => onChange(normalizeFieldValue(field, event.target.value))}
        className="mt-2 w-full rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
      >
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.type === "datetime" ? "datetime-local" : "text"}
      value={String(value)}
      onChange={(event) => onChange(normalizeFieldValue(field, event.target.value))}
      className="mt-2 w-full rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
    />
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
    onChange(nextItems);
    setHighlightedIndex(nextItems.length - 1);
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
        {items.map((item, index) => (
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
              setDragIndex(null);
            }}
            className={`rounded-[1.5rem] border bg-[#faf8f7] p-5 transition ${
              highlightedIndex === index
                ? "border-[#8d120e]/35 ring-2 ring-[#8d120e]/15"
                : "border-black/10"
            }`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Drag handle reinforces the drag affordance — the whole row
                    is draggable, but a visible grip icon makes the behavior
                    discoverable and mirrors the Wix block editor. */}
                <span
                  className={dragHandleClass}
                  role="img"
                  aria-label={`Drag to reorder ${itemLabel.toLowerCase()} ${index + 1}`}
                  title="Drag to reorder"
                >
                  <DragHandleIcon />
                </span>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6a433d]">
                  {itemLabel} {index + 1}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => index > 0 && onChange(moveItem(items, index, index - 1))}
                  className={iconButtonClass}
                  aria-label={`Move ${itemLabel.toLowerCase()} ${index + 1} up`}
                  title="Move up"
                >
                  <ArrowUpIcon />
                </button>
                <button
                  type="button"
                  disabled={index >= items.length - 1}
                  onClick={() => index < items.length - 1 && onChange(moveItem(items, index, index + 1))}
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
            <div className="grid gap-4 md:grid-cols-2">
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
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function PageBuilderSection({
  pages,
  onChange,
  fieldCallbacks,
}: {
  pages: PageDocument[];
  onChange: (pages: PageDocument[]) => void;
  fieldCallbacks: FieldCallbacks;
}) {
  const [pendingBlockTypes, setPendingBlockTypes] = useState<Record<string, string>>(
    Object.fromEntries(pages.map((page) => [page.id, "richText"])),
  );
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLElement | null>>({});
  // Drag state scoped to a single page (slug) so dragging a block in one page
  // never lets you drop it into another — blocks always belong to exactly
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
      description="Edit each public page as a list of reusable blocks. The public routes read these documents directly instead of relying on page-specific hardcoded forms."
    >
      <div className="space-y-8">
        {sortedPages.map((page) => (
          <article key={page.id} className="rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                  Page Label
                </span>
                <input
                  value={page.title}
                  onChange={(event) =>
                    onChange(
                      pages.map((candidate) =>
                        candidate.id === page.id ? { ...candidate, title: event.target.value } : candidate,
                      ),
                    )
                  }
                  className="mt-2 w-full rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                  Page Summary
                </span>
                <textarea
                  value={page.summary ?? ""}
                  onChange={(event) =>
                    onChange(
                      pages.map((candidate) =>
                        candidate.id === page.id ? { ...candidate, summary: event.target.value } : candidate,
                      ),
                    )
                  }
                  className="mt-2 w-full rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-[1.25rem] border border-dashed border-black/12 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#220707]">
                  {pageSlugOptions.find((option) => option.value === page.slug)?.label ?? page.slug}
                </p>
                <p className="mt-1 text-sm text-[#5c4743]">{page.blocks.length} block(s)</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={pendingBlockTypes[page.id] ?? "richText"}
                  onChange={(event) =>
                    setPendingBlockTypes((current) => ({ ...current, [page.id]: event.target.value }))
                  }
                  className="rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
                >
                  {pageBlockTypeOptions.map((option) => (
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
                        (pendingBlockTypes[page.id] ?? "richText") as PageBlock["type"],
                      ),
                      order: page.blocks.length + 1,
                    };

                    onChange(
                      pages.map((candidate) =>
                        candidate.id === page.id
                          ? {
                              ...candidate,
                              blocks: withSequentialOrder([...candidate.blocks, nextBlock]),
                            }
                          : candidate,
                      ),
                    );
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
              {page.blocks.map((block, index) => {
                const fields = getPageBlockFields(block).map((field): FieldConfig => {
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
                          : field.key === "limit"
                            ? (value) => parseNumber(value, 0)
                            : undefined,
                  };
                });

                const isDraggingThis =
                  blockDrag?.pageId === page.id && blockDrag.index === index;

                return (
                  <article
                    key={block.id}
                    ref={(node) => {
                      blockRefs.current[block.id] = node;
                    }}
                    draggable
                    onDragStart={() => setBlockDrag({ pageId: page.id, index })}
                    onDragOver={(event) => {
                      // Only accept drops originating from the same page so
                      // blocks do not accidentally hop between pages.
                      if (blockDrag && blockDrag.pageId === page.id) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={() => {
                      if (!blockDrag || blockDrag.pageId !== page.id || blockDrag.index === index) {
                        return;
                      }
                      reorderBlocks(page.id, blockDrag.index, index);
                      setBlockDrag(null);
                    }}
                    onDragEnd={() => setBlockDrag(null)}
                    className={`rounded-[1.5rem] border bg-white p-5 transition ${
                      highlightedBlockId === block.id
                        ? "border-[#8d120e]/35 ring-2 ring-[#8d120e]/15"
                        : isDraggingThis
                          ? "border-[#8d120e]/40 opacity-60"
                          : "border-black/10"
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={dragHandleClass}
                          role="img"
                          aria-label={`Drag to reorder block ${index + 1}`}
                          title="Drag to reorder"
                        >
                          <DragHandleIcon />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                            Block {index + 1}
                          </p>
                          <h3 className="mt-2 text-2xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                            {getPageBlockLabel(block)}
                          </h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => index > 0 && reorderBlocks(page.id, index, index - 1)}
                          className={iconButtonClass}
                          aria-label={`Move block ${index + 1} up`}
                          title="Move up"
                        >
                          <ArrowUpIcon />
                        </button>
                        <button
                          type="button"
                          disabled={index >= page.blocks.length - 1}
                          onClick={() =>
                            index < page.blocks.length - 1 &&
                            reorderBlocks(page.id, index, index + 1)
                          }
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
                                candidate.id === page.id
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

                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                          Block Type
                        </span>
                        <select
                          value={block.type}
                          onChange={(event) => {
                            const nextBlock = {
                              ...createPageBlockTemplate(event.target.value as PageBlock["type"]),
                              id: block.id,
                              order: block.order,
                            };

                            onChange(
                              pages.map((candidate) =>
                                candidate.id === page.id
                                  ? {
                                      ...candidate,
                                      blocks: candidate.blocks.map((candidateBlock, blockIndex) =>
                                        blockIndex === index ? nextBlock : candidateBlock,
                                      ),
                                    }
                                  : candidate,
                              ),
                            );
                          }}
                          className="mt-2 w-full rounded-[1.25rem] border border-black/12 px-3 py-3 outline-none transition focus:border-[#8d120e]"
                        >
                          {pageBlockTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {fields.map((field) => (
                        <label key={`${block.id}-${field.key}`} className={isWideField(field) ? "md:col-span-2" : ""}>
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                            {field.label}
                          </span>
                          {renderField(
                            block as unknown as Record<string, unknown>,
                            field,
                            (nextValue) =>
                              onChange(
                                pages.map((candidate) =>
                                  candidate.id === page.id
                                    ? {
                                        ...candidate,
                                        blocks: candidate.blocks.map((candidateBlock, blockIndex) =>
                                          blockIndex === index
                                            ? (writeValue(candidateBlock, field.key, nextValue) as PageBlock)
                                            : candidateBlock,
                                        ),
                                      }
                                    : candidate,
                                ),
                              ),
                            fieldCallbacks,
                          )}
                        </label>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        ))}
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
                    <p className="mt-2 text-xs leading-6 text-[#6a433d]">
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
    title: "Manage the live CMS bundle",
    description:
      "This admin is now organized by content type instead of one long page. Use the sidebar to edit pages, promotions, careers, events, settings, and media assets without scrolling through unrelated forms.",
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
    eyebrow: "Content",
    title: "Events, awards, and stories",
    description:
      "Manage event content, recognition, supporting projects, and related editorial cards from one route.",
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
  messages,
  storageMode,
  initialMediaAssets,
  view,
}: AdminDashboardProps) {
  const [draft, setDraft] = useState<RidemaxSiteContent>(initialContent);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(initialMediaAssets);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
    { label: "Promotions", value: String(draft.promotions.length) },
    { label: "Categories", value: String(draft.productCategories.length) },
    { label: "Jobs", value: String(draft.jobs.length) },
    { label: "Events", value: String(draft.events.length) },
    { label: "Media Assets", value: String(mediaAssets.length) },
  ];

  const canSave = view !== "overview" && view !== "media";

  async function handleSave() {
    setSaving(true);

    try {
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
        return;
      }

      fieldCallbacks.onNotice("success", payload.message ?? "Content saved successfully.");
    } catch {
      fieldCallbacks.onNotice("error", "Unable to save the content bundle.");
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
          content: draft,
          path:
            view === "events"
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

  // The persistent sidebar + outer grid live in `app/admin/layout.tsx`. This
  // component owns only the per-view content stack and the in-view toast feed.
  return (
    <>
      <ToastStack toasts={toasts} />
      <div className="space-y-8">
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

              <div className="flex flex-wrap gap-3">
                <form action="/api/admin/logout" method="post">
                  <button type="submit" className={secondaryButtonClass}>
                    Log Out
                  </button>
                </form>
                <a href="/api/admin/preview/disable?path=/admin" className={secondaryButtonClass}>
                  Exit Preview
                </a>
                {view !== "media" ? (
                  <button type="button" onClick={handlePreview} disabled={previewing} className={secondaryButtonClass}>
                    {previewing ? "Opening Preview..." : "Preview"}
                  </button>
                ) : null}
                {canSave ? (
                  <button type="button" onClick={handleSave} disabled={saving} className={primaryButtonClass}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                ) : null}
              </div>
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
              <div className="grid gap-5 md:grid-cols-3">
                {draft.adminOptions.map((option) => (
                  <article key={option.title} className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
                    <h2 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {option.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{option.summary}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {draft.databaseOptions.map((option) => (
                  <article key={option.title} className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e]">Database Option</p>
                    <h2 className="mt-3 text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {option.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{option.summary}</p>
                  </article>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {draft.securityOptions.map((option) => (
                  <article key={option.title} className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e]">Security</p>
                    <h2 className="mt-3 text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {option.title}
                    </h2>
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{option.summary}</p>
                  </article>
                ))}
              </div>

              <SectionCard
                sectionId="inbox"
                title="Inbox"
                description="Messages submitted from the contact form land here."
              >
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-[#faf8f7] p-5 text-sm text-[#5c4743]">
                      No messages yet.
                    </div>
                  ) : (
                    messages.map((message) => (
                      <article key={message.id} className="rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-[#220707]">
                              {message.firstName} {message.lastName}
                            </h3>
                            <p className="text-sm text-[#5c4743]">{message.email}</p>
                          </div>
                          <p className="text-xs uppercase tracking-[0.14em] text-[#7e5a53]">
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-[#412f2b]">{message.message}</p>
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
                  // Intentionally NOT exposing `readOnly` — it is a type-level
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
              <PageBuilderSection pages={draft.pages} onChange={(pages) => setDraft((current) => ({ ...current, pages }))} fieldCallbacks={fieldCallbacks} />

              <CollectionSection
                sectionId="pages-catalog"
                title="Catalog Categories"
                description="CMS-owned category landing pages and storytelling sections. Product rows themselves stay outside the CMS."
                items={draft.productCategories as unknown as Record<string, unknown>[]}
                template={{
                  slug: "",
                  name: "",
                  description: "",
                  heroTitle: "",
                  heroSummary: "",
                  heroImage: { src: "", alt: "" },
                  featuredImage: "",
                  browseTitle: "",
                  browseSummary: "",
                  sectionTitle: "",
                  sectionSummary: "",
                  sections: [],
                }}
                fields={[
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "name", label: "Name", type: "text" },
                  { key: "description", label: "Description", type: "textarea" },
                  { key: "heroTitle", label: "Hero Title", type: "text" },
                  { key: "heroSummary", label: "Hero Summary", type: "textarea" },
                  { key: "heroImage.src", label: "Hero Image", type: "image" },
                  { key: "heroImage.alt", label: "Hero Image Alt", type: "text" },
                  { key: "featuredImage", label: "Featured Image", type: "image" },
                  { key: "browseTitle", label: "Browse Title", type: "text" },
                  { key: "browseSummary", label: "Browse Summary", type: "textarea" },
                  { key: "sectionTitle", label: "Sections Title", type: "text" },
                  { key: "sectionSummary", label: "Sections Summary", type: "textarea" },
                ]}
                onChange={(items) =>
                  setDraft((current) => ({
                    ...current,
                    productCategories: items as unknown as ProductCategory[],
                  }))
                }
                fieldCallbacks={fieldCallbacks}
                itemLabel="Category"
              />

              {draft.productCategories.map((category) => (
                <CollectionSection
                  key={`sections-${category.slug}`}
                  title={`${category.name} Sections`}
                  description="Alternating feature rows for this category page."
                  items={category.sections as unknown as Record<string, unknown>[]}
                  template={{
                    id: "",
                    slug: "",
                    title: "",
                    subtitle: "",
                    image: "",
                    imageAlt: "",
                    paragraphs: [],
                    published: true,
                    order: category.sections.length + 1,
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
                    setDraft((current) => ({
                      ...current,
                      productCategories: current.productCategories.map((candidate) =>
                        candidate.slug === category.slug
                          ? { ...candidate, sections: items as ProductCategory["sections"] }
                          : candidate,
                      ),
                    }))
                  }
                  fieldCallbacks={fieldCallbacks}
                  itemLabel="Section"
                />
              ))}

              <CollectionSection
                sectionId="pages-brands"
                title="Brands"
                description="Brand cards, deep links, and merchandising tags used across the homepage and category pages."
                items={draft.brands as unknown as Record<string, unknown>[]}
                template={{
                  id: "",
                  slug: "",
                  label: "",
                  title: "",
                  summary: "",
                  image: "",
                  href: "",
                  categorySlug: "",
                  tags: [],
                  published: true,
                  order: draft.brands.length + 1,
                }}
                fields={[
                  { key: "id", label: "ID", type: "text" },
                  { key: "slug", label: "Slug", type: "text" },
                  { key: "label", label: "Label", type: "text" },
                  { key: "title", label: "Title", type: "text" },
                  { key: "summary", label: "Summary", type: "textarea" },
                  { key: "image", label: "Image", type: "image" },
                  { key: "href", label: "Link", type: "text" },
                  { key: "categorySlug", label: "Category Slug", type: "text" },
                  { key: "tags", label: "Tags (one per line)", type: "textarea", parse: fromLineList },
                  { key: "published", label: "Published", type: "checkbox" },
                ]}
                onChange={(items) => setDraft((current) => ({ ...current, brands: items as RidemaxSiteContent["brands"] }))}
                fieldCallbacks={fieldCallbacks}
                itemLabel="Brand"
              />
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
                  { key: "startAt", label: "Start At", type: "datetime" },
                  { key: "endAt", label: "End At", type: "datetime" },
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
