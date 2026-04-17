"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Ridemax brand mark renderer.
 *
 * Hides two concerns behind a small interface:
 *  1. The high-resolution JPG (`/ridemax-full-logo.jpg`) is preferred so the
 *     full Team Ridemax Philippines wordmark renders at native resolution.
 *  2. If the JPG is not deployed (e.g. local dev before the asset has been
 *     copied), the component falls back to the existing SVG lockup without
 *     emitting a broken image. Callers don't need to know about the fallback.
 *
 * Callers pass a surface hint (`light` / `dark`) so the SVG fallback still
 * swaps to the inverted mark on dark headers. The JPG stays as-is per brand
 * guidelines — no CSS filters, no `brightness(0)`, no `invert()`.
 */

type RidemaxLogoSurface = "light" | "dark";

type RidemaxLogoProps = {
  /** Used for the SVG fallback when the JPG is missing. */
  surface?: RidemaxLogoSurface;
  /** Rendered width (the height is derived by Next/Image). */
  width?: number;
  /** Rendered height target — also used as the CSS height. */
  height?: number;
  /** Optional className passed to the underlying <Image>. */
  className?: string;
  /** Accessible alt text. Defaults to the brand name. */
  alt?: string;
  /** Set `priority` on the image for header usage. */
  priority?: boolean;
};

const fullLogoSrc = "/ridemax-full-logo.jpg";

function fallbackSrcForSurface(surface: RidemaxLogoSurface) {
  return surface === "dark" ? "/ridemax-logo-light.svg" : "/ridemax-logo.svg";
}

export function RidemaxLogo({
  surface = "light",
  width = 240,
  height = 80,
  className = "ridemax-logo h-[56px] w-auto",
  alt = "Team Ridemax Philippines",
  priority,
}: RidemaxLogoProps) {
  const [useFallback, setUseFallback] = useState(false);

  const src = useFallback ? fallbackSrcForSurface(surface) : fullLogoSrc;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => {
        // Next/Image fires onError on 404 for the JPG asset. Swap once and
        // remember, so we don't loop between sources.
        if (!useFallback) {
          setUseFallback(true);
        }
      }}
    />
  );
}
