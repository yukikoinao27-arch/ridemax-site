import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import { findAdjacentProductItems, findProductItemBySlug } from "@/lib/server/ridemax-content-repository";

export const dynamic = "force-dynamic";

type ProductLandingPageProps = {
  params: Promise<{ itemSlug: string }>;
};

export async function generateMetadata({
  params,
}: ProductLandingPageProps): Promise<Metadata> {
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

export default async function ProductLandingPage({ params }: ProductLandingPageProps) {
  const { itemSlug } = await params;
  const record = await findProductItemBySlug(itemSlug);

  if (!record) {
    notFound();
  }

  const adjacent = await findAdjacentProductItems(record.category.slug, itemSlug);

  return (
    <main className="bg-white py-16">
      <div className="mx-auto max-w-[76rem] px-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[#6a4b45]">
          <p>
            <Link href="/" className="hover:underline">
              Home
            </Link>
            {" / "}
            <Link href="/search?q=tires" className="hover:underline">
              Search Results
            </Link>
            {" / "}
            <span className="text-[#220707]">{record.item.title}</span>
          </p>
          <div className="flex gap-3">
            {adjacent.previous ? (
              <Link
                href={`/product-page/${adjacent.previous.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#220707]"
              >
                Prev
              </Link>
            ) : null}
            {adjacent.next ? (
              <Link
                href={`/product-page/${adjacent.next.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#220707]"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>

        <section className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <ProductGallery title={record.item.title} images={record.item.gallery} />

          <article className="rounded-[1.75rem] border border-black/10 bg-[#faf7f4] p-8">
            <h1 className="text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              {record.item.title}
            </h1>
            <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[#8d120e]">
              SKU: {record.item.sku}
            </p>
            <p className="mt-6 text-base leading-8 text-[#4d3b37]">{record.item.description}</p>

            <div className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#220707]">
                Key Features
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#4d3b37]">
                {record.item.highlights.map((highlight) => (
                  <li key={highlight} className="rounded-2xl border border-black/8 bg-white px-4 py-3">
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            <label className="mt-8 block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d120e]">
                Size *
              </span>
              <select className="mt-2 max-h-44 w-full overflow-y-auto border border-black/18 bg-white px-3 py-3 outline-none focus:border-[#8d120e]">
                <option value="">Select</option>
                {record.item.sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            {/*
              The CTA sits on an off-white card, so the dark pill alone was
              invisible against the browser default text color and rendered as
              an empty oblong. Force the label to white and add a hover lift
              so the link is obvious even before hover.
            */}
            <Link
              href={`/products/${record.category.slug}`}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#220707] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_24px_rgba(34,7,7,0.18)] transition hover:-translate-y-0.5 hover:bg-[#3a0f0d]"
            >
              <span className="text-white">Back to {record.category.name}</span>
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
