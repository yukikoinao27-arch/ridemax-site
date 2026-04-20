import type { ReactNode } from "react";

/*
 * Read-only catalog routes. These pages render CMS-owned category display
 * content and warehouse-owned product data; neither should require a fresh
 * server render on every request. ISR (1h) is the baseline so the CDN can
 * serve the common case and admins can force a rebuild by saving in the
 * dashboard (on-demand revalidation is a future wiring task). The data layer
 * currently calls `noStore()`, which falls back to dynamic rendering; this
 * directive documents the target posture and removes the `force-dynamic`
 * blocker so the data-layer change can land without another route edit.
 */
export const revalidate = 3600;

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return children;
}

