"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
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

function pathFromHref(href: string) {
  return new URL(href, "https://ridemax.local").pathname;
}

function normalizeActivePathname(pathname: string | null) {
  if (!pathname) {
    return "";
  }

  if (pathname.startsWith("/product-page/")) {
    return "/products";
  }

  return pathname;
}

function isHrefActive(pathname: string | null, href: string) {
  const currentPath = normalizeActivePathname(pathname);
  const targetPath = pathFromHref(href);

  if (targetPath === "/") {
    return currentPath === "/";
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

function isNavItemActive(pathname: string | null, item: NavLink) {
  return Boolean(
    isHrefActive(pathname, item.href) ||
      item.children?.some((child) => isHrefActive(pathname, child.href)),
  );
}

export function SiteHeader({ navigation, logoSrc, logoLightSrc, searchPlaceholder }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuState, setMobileMenuState] = useState<{ open: boolean; pathname: string | null }>({
    open: false,
    pathname: null,
  });
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuOpen = mobileMenuState.open && mobileMenuState.pathname === pathname;
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

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileMenuState((current) => ({ ...current, open: false }));
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuState((current) => ({ ...current, open: false }));
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

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

  function handleNavigationClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    handleSamePageNavigation(event, href);
    setMobileMenuState({ open: false, pathname });
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
        <Link href="/" onClick={(event) => handleNavigationClick(event, "/")} className="shrink-0">
          <RidemaxLogo
            src={activeLogoSrc}
            surface={scrolled ? "light" : "dark"}
            className="ridemax-logo h-[56px] w-auto"
            priority
          />
        </Link>

        <nav className="mx-auto hidden items-center gap-4 text-[0.95rem] font-medium lg:flex xl:gap-8">
          {navigation.map((item) => {
            const itemActive = isNavItemActive(pathname, item);

            return item.children ? (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  onClick={(event) => handleNavigationClick(event, item.href)}
                  aria-current={itemActive ? "page" : undefined}
                  aria-haspopup="menu"
                  className={`flex items-center gap-1 rounded-full px-3 py-2 transition ${
                    scrolled
                      ? itemActive
                        ? "bg-[#fff4f3] text-[#8d120e]"
                        : "text-[#2b2b2b] hover:bg-black/5 hover:text-[#2b2b2b]"
                      : itemActive
                        ? "bg-white/10 text-[#f8ddd6]"
                        : "text-white hover:text-[#f3d2ca]"
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
                    {item.children.map((child) => {
                      const childActive = isHrefActive(pathname, child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={(event) => handleNavigationClick(event, child.href)}
                          aria-current={childActive ? "page" : undefined}
                          className={`block px-4 py-2 text-sm transition ${
                            scrolled
                              ? childActive
                                ? "bg-[#E31E24]/10 text-[#E31E24]"
                                : "text-[#2b2b2b] hover:bg-[#E31E24]/10 hover:text-[#E31E24]"
                              : childActive
                                ? "bg-white/10 text-white"
                                : "text-white hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => handleNavigationClick(event, item.href)}
                aria-current={itemActive ? "page" : undefined}
                className={`rounded-full px-3 py-2 transition ${
                  scrolled
                    ? itemActive
                      ? "bg-[#fff4f3] text-[#8d120e]"
                      : "text-[#2b2b2b] hover:bg-black/5 hover:text-[#2b2b2b]"
                    : itemActive
                      ? "bg-white/10 text-[#f8ddd6]"
                      : "text-white hover:text-[#f3d2ca]"
                }`}
              >
                <span className={scrolled ? "" : "ridemax-white-depth"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 lg:block">
          <SearchForm compact placeholder={searchPlaceholder} theme={scrolled ? "light" : "dark"} />
        </div>

        <div ref={mobileMenuRef} className="relative ml-auto lg:hidden">
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-site-navigation"
            onClick={() =>
              setMobileMenuState((current) => ({
                open: !(current.open && current.pathname === pathname),
                pathname,
              }))
            }
            className={`inline-flex cursor-pointer items-center rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] ${
              scrolled
                ? mobileMenuOpen
                  ? "border border-[#8d120e]/25 bg-[#fff4f3] text-[#8d120e]"
                  : "border border-black/20 text-[#1f1f1f]"
                : mobileMenuOpen
                  ? "border border-white/20 bg-white/10 text-white"
                  : "border border-white/20 text-white"
            }`}
          >
            Menu
          </button>
          {mobileMenuOpen ? (
            <div
              id="mobile-site-navigation"
              className={`absolute right-0 top-full mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-3xl p-4 shadow-[0_16px_50px_rgba(0,0,0,0.3)] ${
                scrolled ? "bg-white" : "bg-[#2b2b2b]"
              }`}
            >
              <nav className="flex flex-col gap-2">
                {navigation.map((item) => {
                  const itemActive = isNavItemActive(pathname, item);

                  return item.children ? (
                    <div
                      key={item.href}
                      className={`rounded-2xl p-2 ${
                        scrolled
                          ? itemActive
                            ? "border border-[#8d120e]/15 bg-[#fff4f3]"
                            : "border border-black/8 bg-black/[0.02]"
                          : itemActive
                            ? "border border-white/12 bg-white/8"
                            : "border border-white/8 bg-white/4"
                      }`}
                    >
                      <Link
                        href={item.href}
                        onClick={(event) => handleNavigationClick(event, item.href)}
                        aria-current={itemActive ? "page" : undefined}
                        className={`block rounded-xl px-3 py-2 font-semibold ${
                          scrolled
                            ? itemActive
                              ? "text-[#8d120e]"
                              : "text-[#1f1f1f]"
                            : "text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                      {item.children.map((child) => {
                        const childActive = isHrefActive(pathname, child.href);

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={(event) => handleNavigationClick(event, child.href)}
                            aria-current={childActive ? "page" : undefined}
                            className={`mt-1 block rounded-xl px-3 py-2 text-sm ${
                              scrolled
                                ? childActive
                                  ? "bg-[#E31E24]/10 text-[#E31E24]"
                                  : "text-[#1f1f1f]/85 hover:bg-black/5"
                                : childActive
                                  ? "bg-white/10 text-white"
                                  : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(event) => handleNavigationClick(event, item.href)}
                      aria-current={itemActive ? "page" : undefined}
                      className={`rounded-xl px-3 py-2 font-semibold ${
                        scrolled
                          ? itemActive
                            ? "bg-[#fff4f3] text-[#8d120e]"
                            : "text-[#1f1f1f] hover:bg-black/5"
                          : itemActive
                            ? "bg-white/10 text-white"
                            : "text-white hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <SearchForm className="mt-4" placeholder={searchPlaceholder} theme={scrolled ? "light" : "dark"} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
