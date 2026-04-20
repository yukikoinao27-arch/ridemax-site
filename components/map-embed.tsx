"use client";

import { useMemo, useState } from "react";

type MapEmbedProps = {
  query: string;
  zoom?: number;
  className?: string;
};

export function MapEmbed({ query, zoom = 15, className = "" }: MapEmbedProps) {
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const embedSrc = useMemo(
    () => `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${currentZoom}&output=embed`,
    [currentZoom, query],
  );
  const directionsHref = useMemo(
    () => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
    [query],
  );

  return (
    <div className={`overflow-hidden border border-black/10 bg-white ${className}`.trim()}>
      <div className="flex items-center justify-between gap-4 border-b border-black/10 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
            Map
          </p>
          <p className="mt-1 text-sm text-[#4d3b37]">{query}</p>
        </div>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-[#6e4ce1] underline-offset-4 transition hover:underline"
        >
          Directions
        </a>
      </div>
      <div className="relative">
        <iframe
          title="Ridemax location map"
          src={embedSrc}
          className="h-[22rem] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="absolute bottom-4 right-4 flex overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setCurrentZoom((value) => Math.max(value - 1, 3))}
            className="h-10 w-10 text-xl text-[#220707] transition hover:bg-[#f5efee]"
          >
            -
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setCurrentZoom((value) => Math.min(value + 1, 20))}
            className="h-10 w-10 border-l border-black/10 text-xl text-[#220707] transition hover:bg-[#f5efee]"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
