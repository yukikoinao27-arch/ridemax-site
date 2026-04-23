"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type AnalyticsDataset = {
  kind?: string;
  label?: string;
  href?: string;
  surface?: string;
};

function sendAnalytics(payload: {
  kind: string;
  path: string;
  label?: string;
  href?: string;
  surface?: string;
}) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function readDataset(target: HTMLElement | null): AnalyticsDataset {
  if (!target) {
    return {};
  }

  return {
    kind: target.dataset.analyticsEvent,
    label: target.dataset.analyticsLabel,
    href: target.dataset.analyticsHref,
    surface: target.dataset.analyticsSurface,
  };
}

/**
 * Global public-site analytics collector.
 *
 * One mounted client component owns page-view beacons plus delegated click and
 * submit listeners for any element that opts in via `data-analytics-*`
 * attributes. Server-rendered pages stay simple because they only annotate the
 * links/forms worth tracking.
 */
export function PublicAnalyticsTracker() {
  const pathname = usePathname();
  const lastPageViewPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }

    if (lastPageViewPath.current === pathname) {
      return;
    }

    lastPageViewPath.current = pathname;
    sendAnalytics({ kind: "page_view", path: pathname });
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-analytics-event]") : null;
      const dataset = readDataset(target);
      const kind = dataset.kind;

      if (!kind || kind === "page_view") {
        return;
      }

      sendAnalytics({
        kind,
        path: pathname || "/",
        label: dataset.label,
        href: dataset.href,
        surface: dataset.surface,
      });
    }

    function handleSubmit(event: SubmitEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("form[data-analytics-event]") : null;
      const dataset = readDataset(target);
      const kind = dataset.kind;

      if (!kind) {
        return;
      }

      sendAnalytics({
        kind,
        path: pathname || "/",
        label: dataset.label,
        href: dataset.href,
        surface: dataset.surface,
      });
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, [pathname]);

  return null;
}
