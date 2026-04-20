import type { Metadata } from "next";
import { Montserrat, Oswald } from "next/font/google";
import type { ReactNode } from "react";
import { PublicChatWidget } from "@/components/public-chat-widget";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteContent } from "@/lib/server/ridemax-content-repository";
import "./globals.css";

const bodyFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-body",
});

const titleFont = Oswald({
  subsets: ["latin"],
  variable: "--font-title",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teamridemax.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Team Ridemax",
    template: "%s | Team Ridemax",
  },
  description:
    "Team Ridemax marketing site with a block-based CMS, first-class Promotions, and a read-only external product catalog seam.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const content = await getSiteContent();

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${bodyFont.variable} ${titleFont.variable}`}>
      <body className="min-h-screen bg-[#f7f4f1] text-[#220707] antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader
            navigation={content.navigation}
            logoSrc={content.site.logoSrc}
            logoLightSrc={content.site.logoLightSrc}
            searchPlaceholder={content.site.searchPlaceholder}
          />
          <div className="flex-1">{children}</div>
          <SiteFooter
            logoSrc={content.site.logoSrc}
            logoLightSrc={content.site.logoLightSrc}
            siteName={content.site.siteName}
            description={content.site.footerDescription}
            contact={content.contact}
            categories={content.productCategories}
          />
        </div>
        <PublicChatWidget
          logoSrc={content.site.logoSrc}
          logoLightSrc={content.site.logoLightSrc}
          alt={content.site.siteName}
        />
      </body>
    </html>
  );
}
