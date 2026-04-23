"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminSearchEntry } from "@/lib/server/admin-search-index";

/**
 * Admin command palette.
 *
 * Opens on Ctrl+K / Cmd+K from anywhere in /admin. Marketing types a word,
 * gets fuzzy-matched results across pages, collections, and jump-to-page
 * actions, and presses Enter to navigate. Proven pattern: Linear, Notion,
 * Sanity Studio, Vercel. Chosen because it replaces sidebar scroll with a
 * single keyboard shortcut without adding new UI surface.
 *
 * The palette itself owns the modal, the keyboard handling, and the result
 * ranking. The list of searchable entries comes from `/api/admin/search-index`
 * (gated by admin auth). Filtering runs client-side because the index is
 * bounded by marketing content volume, so a round-trip per keystroke would
 * be waste.
 */

const KIND_LABEL: Record<AdminSearchEntry["kind"], string> = {
  action: "Action",
  page: "Page",
  brand: "Brand",
  news: "News",
  event: "Event",
  award: "Award",
  promotion: "Promotion",
  job: "Job",
  department: "Department",
  inbox: "Inbox",
};

const KIND_SORT_ORDER: Record<AdminSearchEntry["kind"], number> = {
  action: 0,
  page: 1,
  inbox: 2,
  brand: 3,
  news: 4,
  event: 5,
  award: 6,
  promotion: 7,
  job: 8,
  department: 9,
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Score an entry against a query. Returns `null` if the entry does not
 * match, so callers can filter in one pass. Matching on label is weighted
 * heavier than matching on keywords so "home" finds the Home page ahead of
 * any entry that happens to have the word in its description.
 */
function scoreEntry(entry: AdminSearchEntry, query: string): number | null {
  if (!query) {
    return 0;
  }
  const label = normalize(entry.label);
  const description = normalize(entry.description);
  const keywords = entry.keywords.map(normalize);

  if (label === query) return 1000;
  if (label.startsWith(query)) return 600;
  if (label.includes(query)) return 400;
  if (keywords.some((kw) => kw === query)) return 350;
  if (keywords.some((kw) => kw.startsWith(query))) return 200;
  if (keywords.some((kw) => kw.includes(query))) return 120;
  if (description.includes(query)) return 80;
  return null;
}

function filterEntries(entries: AdminSearchEntry[], query: string): AdminSearchEntry[] {
  const normalized = normalize(query);
  if (!normalized) {
    return [...entries].sort(
      (a, b) =>
        KIND_SORT_ORDER[a.kind] - KIND_SORT_ORDER[b.kind] || a.label.localeCompare(b.label),
    );
  }
  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, normalized) }))
    .filter((row): row is { entry: AdminSearchEntry; score: number } => row.score !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        KIND_SORT_ORDER[a.entry.kind] - KIND_SORT_ORDER[b.entry.kind] ||
        a.entry.label.localeCompare(b.entry.label),
    )
    .map((row) => row.entry);
}

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<AdminSearchEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const router = useRouter();

  // Global Ctrl+K / Cmd+K. Also Esc closes. Plus a window-level
  // "admin-palette:open" event so click targets outside this component
  // (e.g. the sidebar search button) can open the palette without prop
  // drilling or context setup.
  useEffect(() => {
    function onKeydown(event: KeyboardEvent) {
      const isPaletteShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isPaletteShortcut) {
        event.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) {
            setQuery("");
            setActiveIndex(0);
          }
          return next;
        });
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    function onOpenEvent() {
      setQuery("");
      setActiveIndex(0);
      setOpen(true);
    }
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("admin-palette:open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("admin-palette:open", onOpenEvent);
    };
  }, []);

  // Lazily fetch the index the first time the palette opens. Refresh on
  // each open so newly created content appears without a full reload.
  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/search-index", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { entries: AdminSearchEntry[] };
        if (!cancelled) {
          setEntries(payload.entries);
        }
      } catch {
        // Palette stays empty; user can close and retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Focus the input when the palette opens. Query/index resets happen in
  // event handlers so render stays derived and lint-clean.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const filtered = useMemo(() => filterEntries(entries, query), [entries, query]);
  const safeActiveIndex =
    filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);

  useEffect(() => {
    if (safeActiveIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[safeActiveIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex]);

  if (!open) {
    return null;
  }

  function closePalette() {
    setOpen(false);
    setQuery("");
  }

  function commit(entry: AdminSearchEntry) {
    closePalette();
    router.push(entry.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = filtered[safeActiveIndex];
      if (entry) {
        commit(entry);
      }
    }
  }

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24"
      onClick={closePalette}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-black/10 px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search pages, content, or actions..."
            className="w-full bg-transparent text-base text-[#220707] outline-none placeholder:text-[#a0918d]"
          />
        </div>
        <ul ref={listRef} className="max-h-96 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[#6a433d]">No results</li>
          ) : (
            filtered.map((entry, index) => {
              const isActive = index === safeActiveIndex;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(entry)}
                    className={`flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-2.5 text-left ${
                      isActive ? "bg-[#fcefee]" : "hover:bg-[#f7f2f1]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[#220707]">
                        {entry.label}
                      </div>
                      {entry.description ? (
                        <div className="truncate text-xs text-[#6a433d]">{entry.description}</div>
                      ) : null}
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-[#f2efec] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#7e5a53]">
                      {KIND_LABEL[entry.kind]}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-t border-black/10 bg-[#faf8f7] px-4 py-2 text-[0.7rem] uppercase tracking-[0.14em] text-[#8a736f]">
          <span>Up/Down navigate | Enter open | Esc close</span>
        </div>
      </div>
    </div>
  );
}
