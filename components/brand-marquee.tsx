import Image from "next/image";
import Link from "next/link";
import type { BrandFeature } from "@/lib/ridemax-types";

type BrandMarqueeProps = {
  brands: ReadonlyArray<BrandFeature>;
  direction?: "right-to-left" | "left-to-right";
  activeSlug?: string;
};

function trackClass(direction: "right-to-left" | "left-to-right") {
  return direction === "left-to-right" ? "animate-ridemax-marquee-reverse" : "animate-ridemax-marquee";
}

/**
 * Renders the looping brand showcase used on the homepage and category pages.
 * The cards stay linkable and data-driven so admin-managed brand content can scale
 * without turning the page into one-off hardcoded promo blocks.
 */
export function BrandMarquee({
  brands,
  direction = "right-to-left",
  activeSlug,
}: BrandMarqueeProps) {
  const loopingBrands = [...brands, ...brands];

  return (
    <div className="overflow-hidden">
      <div className={`flex w-max gap-5 py-2 ${trackClass(direction)}`}>
        {loopingBrands.map((brand, index) => {
          const highlighted = activeSlug === brand.slug;

          return (
            <Link
              key={`${brand.id}-${index}`}
              href={brand.href}
              className={`group relative block h-[19rem] w-[16rem] shrink-0 overflow-hidden rounded-[2rem] border border-black/10 bg-[#190e0d] shadow-[0_18px_40px_rgba(24,18,17,0.14)] transition ${highlighted ? "ring-2 ring-[#6e4ce1]" : ""}`}
            >
              <Image
                src={brand.image}
                alt={brand.label}
                fill
                className="object-cover transition duration-700 group-hover:scale-110"
                sizes="16rem"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,10,10,0.14),rgba(15,10,10,0.82))] transition group-hover:bg-[linear-gradient(180deg,rgba(15,10,10,0.08),rgba(15,10,10,0.9))]" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="inline-flex rounded-full bg-white/12 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/90">
                  {brand.title}
                </div>
                <h3 className="mt-3 text-3xl font-[family:var(--font-title)] uppercase leading-none">
                  {brand.label}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {brand.tags.map((tag) => (
                    <span
                      key={`${brand.slug}-${tag}`}
                      className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/85"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-4 rounded-[1.6rem] border border-white/0 bg-black/0 transition group-hover:border-white/14 group-hover:bg-black/14" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
