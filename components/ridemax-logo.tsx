"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Ridemax brand mark renderer.
 *
 * Source-of-truth order:
 *   1. Admin-uploaded logo passed in via `src` (coming from site_settings -
 *      the "Logo (light surfaces)" and "Logo (dark surfaces)" fields in the
 *      Settings admin). This is what marketing updates to change the header
 *      and footer without a deploy.
 *   2. If the admin-provided `src` errors (e.g. the asset was deleted) or is
 *      empty, we fall back to the bundled SVG lockup in /public. Those two
 *      SVGs are the baseline so a fresh install still renders a brand mark.
 *
 * Callers forward a `surface` hint (light/dark) so the SVG fallback still
 * picks the inverted mark on the dark top-of-page header. The uploaded JPG
 * stays as-is per brand guidelines - no CSS filters, no `brightness(0)`, no
 * `invert()`.
 */

type RidemaxLogoSurface = "light" | "dark";

type RidemaxLogoProps = {
  /** Admin-configured logo URL (site_settings.logoSrc / logoLightSrc). */
  src?: string;
  /** Used for the SVG fallback when `src` is empty or fails to load. */
  surface?: RidemaxLogoSurface;
  /** Rendered width (the height is derived by Next/Image). */
  width?: number;
  /** Rendered height target - also used as the CSS height. */
  height?: number;
  /** Optional className passed to the underlying <Image>. */
  className?: string;
  /** Accessible alt text. Defaults to the brand name. */
  alt?: string;
  /** Set `priority` on the image for header usage. */
  priority?: boolean;
};

function fallbackSrcForSurface(surface: RidemaxLogoSurface) {
  return surface === "dark" ? "/ridemax-logo-light.svg" : "/ridemax-logo.svg";
}

export function RidemaxLogo({
  src,
  surface = "light",
  width = 240,
  height = 80,
  className = "ridemax-logo h-[56px] w-auto",
  alt = "Team Ridemax Philippines",
  priority,
}: RidemaxLogoProps) {
  // Reset the fallback flag whenever the admin swaps the uploaded asset.
  // This keeps a previously-broken URL from sticking the component on the SVG
  // even after the admin re-uploads a working logo.
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);

  const trimmed = (src ?? "").trim();
  const useAdminSrc = trimmed.length > 0 && erroredSrc !== trimmed;
  const resolvedSrc = useAdminSrc ? trimmed : fallbackSrcForSurface(surface);

  return (
    <Image
      // Keying on the source URL forces Next/Image to remount when the admin
      // uploads a new logo, which avoids a stale cached broken state.
      key={resolvedSrc}
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={useAdminSrc}
      onError={() => {
        if (useAdminSrc) {
          setErroredSrc(trimmed);
        }
      }}
    />
  );
}
