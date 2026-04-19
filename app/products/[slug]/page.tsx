import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlternatingFeatureRows } from "@/components/alternating-feature-rows";
import { HeroBanner } from "@/components/hero-banner";
import {
  findProductCategory,
  listPublishedBrands,
} from "@/lib/server/ridemax-content-repository";

// Cache policy inherited from app/products/layout.tsx (ISR 1h).
// Do not add `force-dynamic` here: this page is read-only catalog display
// content that belongs on the CDN, not in the server hot path.

type ProductCategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ brand?: string | string[] }>;
};

function readBrandParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function generateMetadata({
  params,
}: ProductCategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: title || "Products",
    description: "Browse product category details.",
  };
}

export default async function ProductCategoryPage({
  params,
  searchParams,
}: ProductCategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const activeBrand = readBrandParam(query.brand);
  const category = await findProductCategory(slug);

  if (!category) {
    notFound();
  }

  const brands = await listPublishedBrands(category.slug);
  const isTiresCategory = category.slug === "tires";

  return (
    <main>
      <HeroBanner
        image={category.heroImage.src}
        title={category.heroTitle}
        summary={category.heroSummary}
        minHeight="min-h-[26rem]"
        align="left"
      >
        <Link
          href="/products"
          className="inline-flex rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Back to Products
        </Link>
      </HeroBanner>

      {brands.length > 0 ? (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-[72rem] px-6 md:px-10">
            <div className="max-w-3xl">
              <h2 className="text-6xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                {category.name === "Tires" ? "Tire Brands" : `${category.name} Brands`}
              </h2>
              <p className="mt-4 text-base leading-8 text-[#4d3b37]">{category.description}</p>
            </div>

            <div className={`mt-10 grid gap-6 sm:grid-cols-2 ${isTiresCategory ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={brand.href}
                  className={`group overflow-hidden rounded-[1.25rem] border bg-white shadow-[0_6px_12px_rgba(20,16,16,0.11)] transition hover:-translate-y-1 ${activeBrand === brand.slug ? "border-[#8d120e] ring-2 ring-[#8d120e]/20" : "border-[#d3d3d3]"}`}
                >
                  <div className="relative h-40 overflow-hidden bg-[#f4f4f4]">
                    <Image
                      src={brand.image}
                      alt={brand.label}
                      fill
                      className="object-cover saturate-[0.72] brightness-[0.9] transition duration-500 group-hover:scale-110"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-[#7e7e7e]/10 transition group-hover:bg-[#7e7e7e]/4" />
                  </div>
                  <div className="p-4 transition-transform duration-300 group-hover:-translate-y-1">
                    <h3 className="text-2xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {brand.label}
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2 transition-transform duration-300 group-hover:-translate-y-1">
                      {brand.tags.map((tag) => (
                        <span
                          key={`${brand.slug}-${tag}`}
                          className="rounded-full border border-black/10 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#6a4b45]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="see-more mt-4 inline-flex items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-semibold text-[#E31E24] opacity-90 transition duration-300 hover:border-[#E31E24]/70 hover:bg-[#fff6f5]">
                      <span>See More</span>
                      <span aria-hidden="true">-&gt;</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[72rem] px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="text-6xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              {category.sectionTitle}
            </h2>
            <p className="mt-4 text-base leading-8 text-[#4d3b37]">{category.sectionSummary}</p>
          </div>

          <AlternatingFeatureRows sections={category.sections} />
        </div>
      </section>
    </main>
  );
}
