"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { RidemaxLogo } from "@/components/ridemax-logo";
import { SearchForm } from "@/components/search-form";
import type { NavLink } from "@/lib/ridemax-types";

type SiteHeaderProps = {
  navigation: ReadonlyArray<NavLink>;
  /** Logo used on light (scrolled) header. */
  logoSrc: string;
  /** Logo used on dark (top-of-page) header. Falls back to `logoSrc` when empty. */
  logoLightSrc?: string;
  searchPlaceholder: string;
};

export function SiteHeader({ navigation, logoSrc, logoLightSrc, searchPlaceholder }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // Pick the admin-configured asset that matches the current header surface:
  //   • scrolled (light background) → logoSrc
  //   • top-of-page (dark background) → logoLightSrc, falling back to logoSrc
  // If both are empty, RidemaxLogo falls back to the bundled SVG lockups.
  const activeLogoSrc = scrolled ? logoSrc : logoLightSrc || logoSrc;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSamePageNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = new URL(href, window.location.origin);
    const current = new URL(window.location.href);
    if (
      target.pathname !== pathname ||
      target.pathname !== current.pathname ||
      target.search !== current.search ||
      target.hash !== current.hash
    ) {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header
      className={`sticky top-0 z-[9999] border-b transition-colors duration-300 ${
        scrolled
          ? "border-black/10 bg-[#f3f3f3] text-[#2b2b2b] shadow-[0_10px_30px_rgba(20,12,11,0.15)]"
          : "border-white/10 bg-[#2b2b2b] text-white"
      }`}
      style={{ transition: "background-color 0.3s ease" }}
    >
      <div className="mx-auto flex max-w-[118rem] items-center gap-4 px-5 py-3 md:px-8 lg:px-10">
        <Link href="/" onClick={(event) => handleSamePageNavigation(event, "/")} className="shrink-0">
          <RidemaxLogo
            src={activeLogoSrc}
            surface={scrolled ? "light" : "dark"}
            className="ridemax-logo h-[56px] w-auto"
            priority
          />
        </Link>

        <nav className="mx-auto hidden items-center gap-4 text-[0.95rem] font-medium lg:flex xl:gap-8">
          {navigation.map((item) =>
            item.children ? (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={(event) => handleSamePageNavigation(event, item.href)}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1 px-2 py-3 transition ${
                    scrolled ? "text-[#2b2b2b] hover:text-[#2b2b2b] hover:opacity-80" : "text-white hover:text-[#f3d2ca]"
                  }`}
                >
                  <span className={scrolled ? "" : "ridemax-white-depth"}>{item.label}</span>
                  <svg
                    aria-hidden="true"
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    className="transition-transform duration-200 group-hover:rotate-180"
                  >
                    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <div className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                  <div
                    className={`min-w-48 overflow-hidden rounded-xl py-2 shadow-[0_18px_40px_rgba(0,0,0,0.22)] ring-1 ${
                      scrolled ? "bg-white ring-black/5" : "bg-[#1f1f1f] ring-white/10"
                    }`}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={(event) => handleSamePageNavigation(event, child.href)}
                        className={`block px-4 py-2 text-sm transition ${
                          scrolled
                            ? "text-[#2b2b2b] hover:bg-[#E31E24]/10 hover:text-[#E31E24]"
                            : "text-white hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleSamePageNavigation(event, item.href)}
                className={`px-2 py-3 transition ${
                  scrolled ? "text-[#2b2b2b] hover:text-[#2b2b2b] hover:opacity-80" : "text-white hover:text-[#f3d2ca]"
                }`}
              >
                <span className={scrolled ? "" : "ridemax-white-depth"}>{item.label}</span>
              </Link>
            ),
          )}
        </nav>

        <div className="hidden shrink-0 lg:block">
          <SearchForm compact placeholder={searchPlaceholder} theme={scrolled ? "light" : "dark"} />
        </div>

        <details className="relative ml-auto lg:hidden">
          <summary className={`cursor-pointer list-none rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] ${scrolled ? "border border-black/20 text-[#1f1f1f]" : "border border-white/20 text-white"}`}>
            Menu
          </summary>
          <div className={`absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-3xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] ${scrolled ? "bg-white" : "bg-[#2b2b2b]"}`}>
            <nav className="flex flex-col gap-2">
              {navigation.map((item) =>
                item.children ? (
                  <div key={item.href} className={`rounded-2xl p-2 ${scrolled ? "border border-black/8 bg-black/[0.02]" : "border border-white/8 bg-white/4"}`}>
                    <Link href={item.href} onClick={(event) => handleSamePageNavigation(event, item.href)} className={`block rounded-xl px-3 py-2 font-semibold ${scrolled ? "text-[#1f1f1f]" : "text-white"}`}>
                      {item.label}
                    </Link>
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} onClick={(event) => handleSamePageNavigation(event, child.href)} className={`block rounded-xl px-3 py-2 text-sm ${scrolled ? "text-[#1f1f1f]/85 hover:bg-black/5" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} onClick={(event) => handleSamePageNavigation(event, item.href)} className={`rounded-xl px-3 py-2 font-semibold ${scrolled ? "text-[#1f1f1f] hover:bg-black/5" : "text-white hover:bg-white/10"}`}>
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
            <SearchForm className="mt-4" placeholder={searchPlaceholder} theme={scrolled ? "light" : "dark"} />
          </div>
        </details>
      </div>
    </header>
  );
}
