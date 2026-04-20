import type { ReactNode } from "react";

/*
 * Parallel read-only catalog route (search-result entry points). Target posture
 * matches `/app/products/layout.tsx`: ISR at 1h so the CDN handles the common
 * case once the data layer stops calling `noStore()`. Keep this directive in
 * sync with its sibling when the catalog ingestion shape changes.
 */
export const revalidate = 3600;

export default function ProductPageLayout({ children }: { children: ReactNode }) {
  return children;
}

