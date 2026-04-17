import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import {
  findAdjacentProductItems,
  findProductCategory,
  findProductItem,
} from "@/lib/server/ridemax-content-repository";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{ slug: string; itemSlug: string }>;
};

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { itemSlug } = await params;
  const title = itemSlug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    title: title || "Product Details",
    description: "View product details and available variants.",
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug, itemSlug } = await params;
  const category = await findProductCategory(slug);
  const item = await findProductItem(slug, itemSlug);

  if (!category || !item) {
    notFound();
  }

  const adjacent = await findAdjacentProductItems(slug, itemSlug);

  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-[76rem] px-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#6a4b45]">
          <p>
            <Link href="/" className="hover:underline">
              Home
            </Link>
            {" / "}
            <Link href="/products" className="hover:underline">
              Products
            </Link>
            {" / "}
            <Link href={`/products/${category.slug}`} className="hover:underline">
              {category.name}
            </Link>
            {" / "}
            <span className="text-[#220707]">{item.title}</span>
          </p>
          <div className="flex gap-3">
            {adjacent.previous ? (
              <Link
                href={`/products/${category.slug}/${adjacent.previous.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#220707]"
              >
                Prev
              </Link>
            ) : null}
            {adjacent.next ? (
              <Link
                href={`/products/${category.slug}/${adjacent.next.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#220707]"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>

        <section className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <ProductGallery title={item.title} images={item.gallery} />

          <article className="rounded-[1.75rem] border border-black/10 bg-[#faf7f4] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8d120e]">
              {item.brand}
            </p>
            <h1 className="mt-4 text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              {item.title}
            </h1>
            <p className="mt-6 text-base leading-8 text-[#4d3b37]">{item.description}</p>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#220707]">
                Key Features
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#4d3b37]">
                {item.highlights.map((highlight) => (
                  <li key={highlight} className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                  SKU
                </p>
                <p className="mt-2 text-base text-[#220707]">{item.sku}</p>
              </div>
              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                  Size
                </span>
                <select className="mt-2 w-full border border-black/10 bg-white px-3 py-3 outline-none focus:border-[#8d120e]">
                  <option value="">Select</option>
                  {item.sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/*
              Wrap the label in an explicit white <span> so any inherited link
              color (browser default purple/blue, parent prose styles) cannot
              hide the text against the dark pill — that was the empty-oblong
              regression on the Tires product page.
            */}
            <Link
              href={`/products/${category.slug}`}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#220707] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(34,7,7,0.18)] transition hover:-translate-y-0.5 hover:bg-[#3a0f0d]"
            >
              <span className="text-white">Back to {category.name}</span>
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
