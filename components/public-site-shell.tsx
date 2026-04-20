"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type PublicSiteShellProps = {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

/**
 * Owns the boundary between the public marketing chrome and the admin app.
 * Admin routes should use their own CMS navigation, while public routes keep
 * the customer-facing header/footer.
 */
export function PublicSiteShell({ header, footer, children }: PublicSiteShellProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  );
}
