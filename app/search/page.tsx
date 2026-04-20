import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { HeroBanner } from "@/components/hero-banner";
import { getHeroBlock } from "@/lib/page-builder";
import { getSiteContent, searchSite } from "@/lib/server/ridemax-content-repository";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    kind?: string | string[];
    category?: string | string[];
  }>;
};

function readQuery(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readMultiValue(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return [value];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = readQuery(params.q);
  const selectedKinds = new Set(readMultiValue(params.kind));
  const selectedCategories = new Set(readMultiValue(params.category).map(normalize));
  const content = await getSiteContent();
  const homePage = content.pages.find((candidate) => candidate.slug === "home") ?? null;
  const heroBlock = getHeroBlock(homePage);
  const rawResults = await searchSite(query);
  const allCategoryFilters = ["Tire", "PCR", "TBR"];

  const results = rawResults.filter((result) => {
    if (selectedKinds.size > 0 && !selectedKinds.has(result.kind)) {
      return false;
    }

    if (selectedCategories.size === 0) {
      return true;
    }

    const searchable = [result.title, ...(result.keywords ?? [])].map(normalize).join(" ");
    return [...selectedCategories].some((category) => searchable.includes(category));
  });
  const sortedResults = [...results].sort((left, right) => {
    const kindScore = (kind: string) => {
      if (kind === "Product") return 0;
      if (kind === "Category") return 1;
      return 2;
    };
    return kindScore(left.kind) - kindScore(right.kind);
  });

  return (
    <main>
      <HeroBanner
        image={heroBlock?.image.src ?? content.productCategories[0]?.heroImage.src ?? ""}
        title="Search"
        summary="Find pages, products, jobs, events, awards, and story content from Team Ridemax."
        minHeight="min-h-[18rem]"
      >
        <div className="mx-auto max-w-xl">
          <SearchForm
            defaultValue={query}
            placeholder={content.site.searchPlaceholder}
            className="max-w-xl"
          />
        </div>
      </HeroBanner>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[70rem] px-6 md:px-10">
          {!query ? (
            <div className="rounded-[1.75rem] border border-black/10 bg-[#faf8f7] p-8 text-[#4d3b37]">
              Try searches like <span className="font-semibold">tires</span>,{" "}
              <span className="font-semibold">michelin</span>,{" "}
              <span className="font-semibold">events</span>, or{" "}
              <span className="font-semibold">careers</span>.
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[1.75rem] border border-black/10 bg-[#faf8f7] p-8 text-[#4d3b37]">
              No results for <span className="font-semibold">{query}</span>.
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
              <aside className="h-fit rounded-[1.5rem] border border-black/10 bg-white p-5">
                <p className="text-xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                  Filter by
                </p>
                <form className="mt-5 space-y-5" action="/search">
                  <input type="hidden" name="q" value={query} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e]">
                      Category
                    </p>
                    <div className="mt-3 space-y-2">
                      {allCategoryFilters.map((category) => (
                        <label key={category} className="flex items-center gap-2 text-sm text-[#4d3b37]">
                          <input
                            type="checkbox"
                            name="category"
                            value={category}
                            defaultChecked={selectedCategories.has(normalize(category))}
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex rounded-full bg-[#220707] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                  >
                    Apply Filters
                  </button>
                </form>
              </aside>
              <div>
                <p className="text-sm uppercase tracking-[0.16em] text-[#8d120e]">
                  {sortedResults.length} result{sortedResults.length === 1 ? "" : "s"} for {query}
                </p>
                <div className="mt-6 space-y-4">
                  {sortedResults.map((result) => (
                    <Link
                      key={`${result.kind}-${result.href}-${result.title}`}
                      href={result.href}
                      className="grid overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_26px_rgba(28,20,19,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(28,20,19,0.1)] sm:grid-cols-[12rem_1fr]"
                    >
                      <div className="relative min-h-40 bg-[#f2ece9]">
                        {result.image ? (
                          <Image
                            src={result.image}
                            alt={result.title}
                            fill
                            className="object-cover"
                            sizes="12rem"
                          />
                        ) : null}
                      </div>
                      <div className="p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e]">
                          {result.kind}
                        </p>
                        <h2 className="mt-3 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                          {result.title}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{result.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
