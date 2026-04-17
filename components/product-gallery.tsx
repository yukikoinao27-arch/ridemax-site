"use client";

import Image from "next/image";
import { useState } from "react";

type ProductGalleryProps = {
  title: string;
  images: ReadonlyArray<string>;
};

export function ProductGallery({ title, images }: ProductGalleryProps) {
  const gallery = images.length > 0 ? images : [];
  const [activeImage, setActiveImage] = useState(gallery[0] ?? "");

  return (
    <div>
      <div className="relative min-h-[26rem] overflow-hidden rounded-[1.75rem] border border-black/10 bg-white">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={title}
            fill
            className="object-contain bg-white"
            sizes="(min-width: 1024px) 38rem, 100vw"
          />
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
        {gallery.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveImage(image)}
            className={`relative aspect-square overflow-hidden rounded-2xl border ${activeImage === image ? "border-[#6e4ce1] ring-2 ring-[#6e4ce1]/25" : "border-black/10"}`}
          >
            <Image
              src={image}
              alt={`Thumbnail ${index + 1}: ${title}`}
              fill
              className="object-cover"
              sizes="7rem"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
