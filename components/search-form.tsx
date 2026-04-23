"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PointerEvent } from "react";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import type { SearchRecord } from "@/lib/ridemax-types";

type SearchFormProps = {
  defaultValue?: string;
  compact?: boolean;
  className?: string;
  placeholder?: string;
  theme?: "dark" | "light";
  quickMatchesLabel?: string;
  maxResults?: number;
};

export function SearchForm({
  defaultValue,
  compact = false,
  className = "",
  placeholder = "Search...",
  theme = "dark",
  quickMatchesLabel = "Quick matches",
  maxResults = 6,
}: SearchFormProps) {
  const [query, setQuery] = useState(defaultValue ?? "");
  const [results, setResults] = useState<SearchRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const router = useRouter();
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();
  const showFeedback = open && trimmedQuery.length >= 2 && (loading || results.length > 0 || searchedQuery === trimmedQuery);

  function openSearchInNewTab() {
    const nextQuery = query.trim();

    if (!nextQuery) {
      return;
    }

    window.open(`/search?q=${encodeURIComponent(nextQuery)}`, "_blank", "noopener,noreferrer");
  }

  function handleQuickMatchPointerDown(event: PointerEvent<HTMLAnchorElement>, href: string) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setNavigatingHref(href);
    setOpen(true);
    startNavigation(() => {
      router.push(href);
    });
  }

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();
    if (normalizedQuery.length < 2) {
      setLoading(false);
      setResults([]);
      setSearchedQuery("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchedQuery("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { results?: SearchRecord[] };
        const resultLimit = compact ? Math.min(maxResults, 4) : maxResults;
        setResults((payload.results ?? []).slice(0, resultLimit));
        setSearchedQuery(normalizedQuery);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [compact, deferredQuery, maxResults]);

  return (
    <div className={`relative z-[80] ${compact ? "w-[14rem]" : "w-full max-w-xl"} ${className}`.trim()}>
      <form
        action="/search"
        className={`relative z-[2] flex items-center overflow-hidden rounded-full border backdrop-blur-sm ${
          theme === "light"
            ? "border-black/14 bg-white text-[#2b2b2b]"
            : "border-white/18 bg-white/18 text-white"
        } ${compact ? "w-[14rem]" : "w-full max-w-xl"}`.trim()}
      >
        <svg
          aria-hidden="true"
          className={`pointer-events-none absolute left-3 h-4 w-4 ${
            theme === "light" ? "text-[#2b2b2b]/85" : "text-white/80"
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          name="q"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              openSearchInNewTab();
            }
          }}
          className={`w-full bg-transparent outline-none ${
            theme === "light" ? "text-[#2b2b2b] placeholder:text-[#2b2b2b]/70" : "text-white placeholder:text-white/75"
          } ${compact ? "py-2 pl-9 pr-3 text-xs" : "py-3 pl-10 pr-4 text-sm"}`}
        />
      </form>

      {showFeedback ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[1000] overflow-hidden rounded-[1.5rem] border border-white/8 bg-[#574441]/96 p-2 shadow-[0_24px_55px_rgba(0,0,0,0.28)] backdrop-blur-md"
          aria-live="polite"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm font-semibold text-white">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm leading-6 text-white/80">
              No quick matches yet. Press Enter to open full search.
            </div>
          ) : (
            <>
              <div className="px-4 pb-1 pt-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#f0c5bd]">
                {results.length} {quickMatchesLabel}
              </div>
              {results.map((result) => (
                <Link
                  key={`${result.kind}-${result.href}-${result.title}`}
                  href={result.href}
                  onPointerDown={(event) => handleQuickMatchPointerDown(event, result.href)}
                  className="block cursor-pointer rounded-[1.1rem] px-4 py-3 text-white transition hover:bg-white/10 aria-[busy=true]:bg-white/12"
                  aria-busy={navigatingHref === result.href && isNavigating}
                >
                  <div className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#f0c5bd]">
                    {result.kind}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{result.title}</span>
                    {navigatingHref === result.href ? (
                      <span className="shrink-0 rounded-full bg-white/12 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-white/80">
                        Opening...
                      </span>
                    ) : null}
                  </div>
                  {!compact ? (
                    <div className="mt-1 text-xs leading-5 text-white/74">{result.summary}</div>
                  ) : null}
                </Link>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
