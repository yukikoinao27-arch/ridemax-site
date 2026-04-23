import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlternatingFeatureRows } from "@/components/alternating-feature-rows";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { HeroBanner } from "@/components/hero-banner";
import {
  findProductCategory,
  listPublishedBrands,
  listPublishedProductItems,
} from "@/lib/server/ridemax-content-repository";
import type { BrandFeature, ProductItem } from "@/lib/ridemax-types";

// Cache policy inherited from app/products/layout.tsx (ISR 1h).
// Do not add `force-dynamic` here: this page is read-only catalog display
// content that belongs on the CDN, not in the server hot path.

type ProductCategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ brand?: string | string[]; tag?: string | string[]; sort?: string | string[] }>;
};

function readFirstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readQueryList(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function normalizeBrandKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function brandOwnsProduct(brand: BrandFeature, product: ProductItem) {
  const productBrand = normalizeBrandKey(product.brand);

  return [brand.slug, brand.label, brand.title].some(
    (candidate) => normalizeBrandKey(candidate) === productBrand,
  );
}

function buildBrandFilterOptions(products: ProductItem[]) {
  const preferred = ["Tire", "PCR", "TBR", "PCLT", "Offroad", "Off-road"];
  const tags = new Set(products.flatMap((product) => product.tags));

  return preferred.filter((option) => option === "Tire" || tags.has(option));
}

function sortProducts(products: ProductItem[], sort: string) {
  const next = [...products];

  switch (sort) {
    case "newest":
      return next.sort((left, right) => right.order - left.order);
    case "name-asc":
      return next.sort((left, right) => left.title.localeCompare(right.title));
    case "name-desc":
      return next.sort((left, right) => right.title.localeCompare(left.title));
    default:
      return next.sort((left, right) => left.order - right.order);
  }
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
  const activeBrand = readFirstQueryValue(query.brand);
  const selectedSort = readFirstQueryValue(query.sort) || "best";
  const selectedTags = new Set(readQueryList(query.tag).map(normalizeBrandKey));
  const category = await findProductCategory(slug);

  if (!category) {
    notFound();
  }

  const brands = await listPublishedBrands(category.slug);
  const products = await listPublishedProductItems(category.slug);
  const activeBrandRecord = activeBrand
    ? brands.find((brand) => brand.slug === activeBrand) ?? null
    : null;
  const brandProducts = activeBrandRecord
    ? products.filter((product) => brandOwnsProduct(activeBrandRecord, product))
    : [];
  const filterOptions = buildBrandFilterOptions(brandProducts);
  const filteredBrandProducts =
    selectedTags.size > 0
      ? brandProducts.filter((product) =>
          ["Tire", ...product.tags].some((tag) => selectedTags.has(normalizeBrandKey(tag))),
        )
      : brandProducts;
  const sortedBrandProducts = sortProducts(filteredBrandProducts, selectedSort);
  const showBrandSection = Boolean(activeBrandRecord);
  const hasBrandResults = sortedBrandProducts.length > 0;
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
                  href={`/products/${category.slug}?brand=${brand.slug}`}
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

      {showBrandSection ? (
        <section className="bg-[#f3f1f0] py-16">
          <div className={`mx-auto grid max-w-[72rem] gap-8 px-6 md:px-10 ${hasBrandResults ? "lg:grid-cols-[18rem_1fr]" : ""}`}>
            {hasBrandResults ? (
              <aside className="h-fit rounded-[1.25rem] border border-black/10 bg-white p-5 shadow-[0_10px_28px_rgba(31,20,19,0.06)]">
                <form action={`/products/${category.slug}`} className="space-y-5">
                  <input type="hidden" name="brand" value={activeBrandRecord?.slug ?? ""} />
                  <div>
                    <h2 className="text-2xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      Filter by
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a4b45]">
                      Refine {activeBrandRecord?.label} products.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                      Category
                    </p>
                    <div className="mt-3 space-y-3">
                      {filterOptions.map((option) => (
                        <label key={option} className="flex cursor-pointer items-center gap-3 text-sm text-[#2b1512]">
                          <input
                            type="checkbox"
                            name="tag"
                            value={option}
                            defaultChecked={selectedTags.has(normalizeBrandKey(option))}
                            className="h-4 w-4 rounded border-black/20"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="cursor-pointer rounded-full bg-[#220707] px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-[#8d120e]">
                    Apply filters
                  </button>
                </form>
              </aside>
            ) : null}

            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8d120e]">
                    {sortedBrandProducts.length} result(s)
                  </p>
                  <h2 className="mt-3 text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                    {activeBrandRecord?.label} {category.name}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5c4743]">
                    Browse the available {activeBrandRecord?.label} options in this category.
                  </p>
                </div>
                {hasBrandResults ? (
                  <form action={`/products/${category.slug}`} className="flex items-center gap-3">
                    <input type="hidden" name="brand" value={activeBrandRecord?.slug ?? ""} />
                    {Array.from(selectedTags).map((tag) => (
                      <input key={tag} type="hidden" name="tag" value={tag} />
                    ))}
                    <label className="text-sm font-semibold text-[#4d3b37]">
                      Sort by
                      <AutoSubmitSelect
                        name="sort"
                        defaultValue={selectedSort}
                        className="ml-3 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium outline-none transition hover:border-[#8d120e]/30 focus:border-[#8d120e]"
                      >
                        <option value="best">Best Match</option>
                        <option value="newest">Newest</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                      </AutoSubmitSelect>
                    </label>
                  </form>
                ) : null}
              </div>

              {hasBrandResults ? (
                <div className="mt-8 grid gap-5">
                  {sortedBrandProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product-page/${product.slug}`}
                      className="group grid overflow-hidden rounded-[1.25rem] border border-black/10 bg-white shadow-[0_10px_30px_rgba(31,20,19,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(31,20,19,0.10)] md:grid-cols-[16rem_1fr]"
                    >
                      <div className="relative min-h-[12rem] bg-[#f7f7f7]">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(min-width: 768px) 16rem, 100vw"
                        />
                      </div>
                      <div className="p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8d120e]">
                          Product
                        </p>
                        <h3 className="mt-3 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                          {product.title}
                        </h3>
                        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#5c4743]">
                          {product.summary}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {product.tags.map((tag) => (
                            <span
                              key={`${product.id}-${tag}`}
                              className="rounded-full border border-black/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#6a4b45]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[1.5rem] border border-dashed border-black/12 bg-white p-8 text-sm leading-7 text-[#5c4743]">
                  Products for {activeBrandRecord?.label} are still being added. This brand page now stays selected so customers do not bounce back to the generic category grid while inventory is filling in.
                </div>
              )}
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
