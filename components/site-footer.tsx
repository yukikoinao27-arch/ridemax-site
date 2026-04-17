import Link from "next/link";
import { RidemaxLogo } from "@/components/ridemax-logo";
import { SocialLinks } from "@/components/social-links";
import type { ContactSettings, ProductCategory } from "@/lib/ridemax-types";

type SiteFooterProps = {
  logoSrc: string;
  /** Logo used on the dark footer background. Falls back to `logoSrc` when empty. */
  logoLightSrc?: string;
  siteName: string;
  description: string;
  contact: ContactSettings;
  categories: ReadonlyArray<ProductCategory>;
};

export function SiteFooter({ logoSrc, logoLightSrc, siteName, description, contact, categories }: SiteFooterProps) {
  // Admin-configured SVG sources remain available as a fallback inside the
  // RidemaxLogo component; the full-color JPG wordmark is the preferred asset.
  void logoSrc;
  void logoLightSrc;

  return (
    <footer className="bg-[#2b0000] text-white">
      <div className="mx-auto flex max-w-[118rem] flex-col gap-12 px-6 py-20 md:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-4">
            <RidemaxLogo surface="dark" alt={siteName} className="ridemax-logo h-[56px] w-auto" />
          </div>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/75">{description}</p>
        </div>

        <div className="grid flex-1 gap-10 sm:grid-cols-2 lg:max-w-[44rem] lg:grid-cols-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Company</h2>
            <div className="mt-5 flex flex-col gap-3 text-white/85">
              <Link href="/about#top">About Us</Link>
              <Link href="/events">Events</Link>
              <Link href="/awards">Awards</Link>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">Products</h2>
            <div className="mt-5 flex flex-col gap-3 text-white/85">
              {categories.map((category) => (
                <Link key={category.slug} href={`/products/${category.slug}`}>
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">Online Shops</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {contact.shops.map((shop) => (
                <a
                  key={shop.label}
                  href={shop.href}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white/18"
                >
                  {shop.label}
                </a>
              ))}
            </div>
            <div className="mt-6">
              <SocialLinks links={contact.socials} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
