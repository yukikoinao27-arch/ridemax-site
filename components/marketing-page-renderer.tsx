import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { AlternatingFeatureRows } from "@/components/alternating-feature-rows";
import { BrandMarquee } from "@/components/brand-marquee";
import { CareersJobBrowser } from "@/components/careers-job-browser";
import { ContactForm } from "@/components/contact-form";
import { HeroBanner } from "@/components/hero-banner";
import { ImageMarquee } from "@/components/image-marquee";
import { MapEmbed } from "@/components/map-embed";
import { PromotionVideoCard } from "@/components/promotion-video-card";
import { SocialLinks } from "@/components/social-links";
import { pickFeaturedJobs } from "@/lib/server/ridemax-content-repository";
import type {
  AwardItem,
  BlockAppearance,
  BrandFeature,
  CardPresetVariant,
  EventItem,
  NewsItem,
  PageBlock,
  PageDocument,
  ProductCategory,
  PromotionItem,
  RidemaxSiteContent,
} from "@/lib/ridemax-types";

type MarketingPageRendererProps = {
  content: RidemaxSiteContent;
  page: PageDocument;
  initialDepartment?: string;
};

const sectionBackgroundClasses = {
  "surface-1": "bg-white",
  "surface-2": "bg-[#f2efec]",
  "surface-3": "bg-[#faf8f7]",
  "brand-red": "bg-[#E31E24]",
  "deep-brand-red": "bg-[#A00000]",
  ink: "bg-[#220707]",
} satisfies Record<NonNullable<BlockAppearance["background"]>, string>;

const sectionDecorationColors = {
  "brand-red": "#b30d0d",
  "deep-brand-red": "#A00000",
  wine: "#300000",
  "surface-1": "#ffffff",
  "surface-2": "#f2efec",
  "surface-3": "#faf8f7",
} satisfies Record<NonNullable<NonNullable<BlockAppearance["decoration"]>["color"]>, string>;

const sectionHeadingScaleClasses = {
  compact: "text-5xl",
  standard: "text-6xl",
  display: "text-7xl",
} satisfies Record<NonNullable<BlockAppearance["headingScale"]>, string>;

const sectionHeadingStyleClasses = {
  standard: "uppercase tracking-[-0.02em]",
  large: "uppercase tracking-[-0.035em]",
  emphasis: "uppercase tracking-[-0.02em] drop-shadow-[0_8px_18px_rgba(227,30,36,0.14)]",
  minimal: "normal-case tracking-[-0.01em]",
} satisfies Record<NonNullable<BlockAppearance["headingStyle"]>, string>;

const sectionTextToneClasses = {
  default: {
    eyebrow: "text-[#8d120e]",
    title: "text-[#220707]",
    summary: "text-[#4d3b37]",
  },
  muted: {
    eyebrow: "text-[#7e5a53]",
    title: "text-[#2b2321]",
    summary: "text-[#6a5a55]",
  },
  brand: {
    eyebrow: "text-[#8d120e]",
    title: "text-[#8d120e]",
    summary: "text-[#5d0d0a]",
  },
} satisfies Record<NonNullable<BlockAppearance["textTone"]>, { eyebrow: string; title: string; summary: string }>;

const sectionTextColorSchemeClasses = {
  default: sectionTextToneClasses.default,
  dark: {
    eyebrow: "text-[#8d120e]",
    title: "text-[#220707]",
    summary: "text-[#4d3b37]",
  },
  light: {
    eyebrow: "text-white/80",
    title: "text-white",
    summary: "text-white/85",
  },
  muted: sectionTextToneClasses.muted,
  brand: sectionTextToneClasses.brand,
} satisfies Record<NonNullable<BlockAppearance["textColorScheme"]>, { eyebrow: string; title: string; summary: string }>;

const categoryGridLayoutClasses = {
  standard: "mt-10 grid gap-6 md:grid-cols-3",
  compact: "mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4",
  feature: "mt-10 grid gap-7 lg:grid-cols-3",
} satisfies Record<NonNullable<BlockAppearance["layoutPreset"]>, string>;

const categoryBodyTextClasses = {
  standard: "mt-4 text-sm leading-7 text-[#4d3b37]",
  short: "mt-4 text-sm leading-6 text-[#4d3b37] line-clamp-2",
  editorial: "mt-4 text-base leading-8 text-[#4d3b37]",
} satisfies Record<NonNullable<BlockAppearance["bodyTextPreset"]>, string>;

const categoryCtaClasses = {
  solid:
    "mt-5 inline-flex items-center gap-2 rounded-full bg-[#E31E24] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(227,30,36,0.25)] transition hover:-translate-y-0.5 hover:bg-[#b8181c]",
  outline:
    "mt-5 inline-flex items-center gap-2 rounded-full border border-[#E31E24]/40 bg-white px-5 py-2.5 text-sm font-semibold text-[#8d120e] transition hover:-translate-y-0.5 hover:border-[#E31E24] hover:bg-[#fff6f5]",
  text:
    "mt-5 inline-flex items-center gap-2 rounded-md px-1 py-1 text-sm font-semibold text-[#E31E24] transition hover:-translate-y-0.5 hover:bg-[#fff6f5]",
} satisfies Record<NonNullable<BlockAppearance["ctaPreset"]>, string>;

function sectionBackgroundClass(appearance?: BlockAppearance, fallback: NonNullable<BlockAppearance["background"]> = "surface-1") {
  return sectionBackgroundClasses[appearance?.background ?? fallback];
}

function sectionClass(
  block: PageBlock,
  spacing: string,
  extraClass = "",
  fallbackBackground: NonNullable<BlockAppearance["background"]> = "surface-1",
) {
  return `relative overflow-hidden ${sectionBackgroundClass(block.appearance, fallbackBackground)} ${spacing} ${extraClass}`.trim();
}

function topDecorationInsetClass(appearance?: BlockAppearance) {
  const decoration = appearance?.decoration;

  if (!decoration || decoration.position !== "top") {
    return "";
  }

  if (decoration.style === "cross-wave") {
    switch (decoration.size) {
      case "lg":
        return "pt-16 md:pt-20";
      case "sm":
        return "pt-10 md:pt-12";
      default:
        return "pt-12 md:pt-16";
    }
  }

  if (decoration.style === "curve" || decoration.style === "wave" || decoration.style === "diagonal") {
    switch (decoration.size) {
      case "lg":
        return "pt-12 md:pt-16";
      case "sm":
        return "pt-8 md:pt-10";
      default:
        return "pt-10 md:pt-12";
    }
  }

  return "";
}

function SectionDecoration({ appearance }: { appearance?: BlockAppearance }) {
  const decoration = appearance?.decoration;
  const style = decoration?.style ?? "none";

  if (style === "none") {
    return null;
  }

  const position = decoration?.position ?? "bottom";
  const size = decoration?.size ?? "md";
  const color = decoration?.color ?? "brand-red";
  const decorationColor = sectionDecorationColors[color];

  if (style === "cross-wave") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 260"
        preserveAspectRatio="none"
        className={`section-decoration section-decoration--vector section-decoration--${style} section-decoration--${position} section-decoration--${size}`}
        style={{ color: decorationColor } as CSSProperties}
      >
        <path
          fill="currentColor"
          d="M0 0C188 0 322 70 500 108C678 70 812 0 1000 0V260C812 260 678 190 500 152C322 190 188 260 0 260V0Z"
        />
      </svg>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`section-decoration section-decoration--${style} section-decoration--${position} section-decoration--${size}`}
      style={{ "--section-decoration-color": decorationColor } as CSSProperties}
    />
  );
}

function SectionHeader({
  eyebrow,
  title,
  summary,
  appearance,
}: {
  eyebrow?: string;
  title?: string;
  summary?: string;
  appearance?: BlockAppearance;
}) {
  if (!eyebrow && !title && !summary) {
    return null;
  }

  const headingScale = appearance?.headingScale ?? "standard";
  const headingStyle = appearance?.headingStyle ?? "standard";
  const textColorScheme = appearance?.textColorScheme ?? appearance?.textTone ?? "default";
  const textTone = sectionTextColorSchemeClasses[textColorScheme];

  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${textTone.eyebrow}`}>
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className={`mt-3 font-[family:var(--font-title)] leading-none ${sectionHeadingScaleClasses[headingScale]} ${sectionHeadingStyleClasses[headingStyle]} ${textTone.title}`}>
          {title}
        </h2>
      ) : null}
      {summary ? <p className={`mt-4 text-base leading-8 ${textTone.summary}`}>{summary}</p> : null}
    </div>
  );
}

function limitItems<T>(items: ReadonlyArray<T>, limit?: number) {
  return typeof limit === "number" && limit > 0 ? items.slice(0, limit) : [...items];
}

function buildCalendarItems(events: EventItem[]) {
  if (events.length === 0) {
    return [] as { label: number; inMonth: boolean; title?: string }[];
  }

  const firstEvent = new Date(events[0].startAt);
  const year = firstEvent.getUTCFullYear();
  const month = firstEvent.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const startOffset = firstDay.getUTCDay();
  const startDate = new Date(Date.UTC(year, month, 1 - startOffset));

  return Array.from({ length: 35 }, (_, index) => {
    const cellDate = new Date(startDate);
    cellDate.setUTCDate(startDate.getUTCDate() + index);
    const iso = cellDate.toISOString().slice(0, 10);
    const event = events.find((item) => item.startAt.slice(0, 10) === iso);

    return {
      label: cellDate.getUTCDate(),
      inMonth: cellDate.getUTCMonth() === month,
      title: event?.title,
    };
  });
}

function monthLabel(events: EventItem[]) {
  if (events.length === 0) {
    return "Calendar";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(events[0].startAt));
}

/**
 * Card preset dispatch.
 *
 * Every card-style collection renders through one of three presets. The
 * preset owns mobile breakpoints, image aspect ratio, and text placement,
 * so marketing cannot produce an inconsistent mobile layout by tweaking
 * per-block knobs. Adding a fourth preset is a design change that requires
 * editing this file; it is not a CMS field.
 *
 * Grid shape is fixed across presets: 1 column on mobile, 2 on small,
 * 3 on medium and up. The only thing that changes between presets is the
 * card body.
 */
const CARD_GRID_CLASS = "mt-10 grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

function resolveCardPreset(appearance?: BlockAppearance): CardPresetVariant {
  return appearance?.cardPreset ?? "standard";
}

type CardItem = {
  key: string;
  imageSrc: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  summary?: string;
  href?: string;
  ctaLabel?: string;
};

function brandToCardItem(brand: BrandFeature): CardItem {
  return {
    key: brand.id,
    imageSrc: brand.image,
    imageAlt: brand.label,
    title: brand.label,
    summary: brand.summary,
    href: brand.href,
    ctaLabel: "Read More",
  };
}

function newsToCardItem(story: NewsItem): CardItem {
  return {
    key: story.id,
    imageSrc: story.image,
    imageAlt: story.title,
    title: story.title,
    summary: story.excerpt,
    href: "/news",
    ctaLabel: "Read more",
  };
}

function eventToCardItem(event: EventItem): CardItem {
  return {
    key: event.id,
    imageSrc: event.image,
    imageAlt: event.title,
    eyebrow: event.teaserDate,
    title: event.title,
    summary: event.summary,
    href: `/events/${event.slug}`,
    ctaLabel: "Details",
  };
}

/**
 * Renders one card according to the preset. Kept in-file with the renderers
 * so new presets stay next to the grid wrapper they belong to.
 */
function renderCard(item: CardItem, preset: CardPresetVariant) {
  if (preset === "imageOverlay") {
    return (
      <article
        key={item.key}
        className="card-lift relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-black/10 shadow-[0_14px_30px_rgba(28,20,19,0.08)]"
      >
        <Image
          src={item.imageSrc}
          alt={item.imageAlt}
          fill
          className="object-cover transition duration-500 hover:scale-105"
          sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          {item.eyebrow ? (
            <p className="text-xs uppercase tracking-[0.12em] opacity-80">{item.eyebrow}</p>
          ) : null}
          <h3 className="mt-2 text-3xl font-[family:var(--font-title)] uppercase leading-none">
            {item.title}
          </h3>
          {item.summary ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-90">{item.summary}</p>
          ) : null}
          {item.href && item.ctaLabel ? (
            <Link
              href={item.href}
              data-analytics-event="cta_click"
              data-analytics-label={item.ctaLabel ?? item.title}
              data-analytics-href={item.href}
              data-analytics-surface="collection-card-overlay"
              className="mt-3 inline-flex text-sm font-semibold underline underline-offset-2"
            >
              {item.ctaLabel}
            </Link>
          ) : null}
        </div>
      </article>
    );
  }

  if (preset === "brandLogo") {
    return (
      <article
        key={item.key}
        className="card-lift flex aspect-square flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_14px_30px_rgba(28,20,19,0.08)]"
      >
        <div className="relative h-24 w-full">
          <Image
            src={item.imageSrc}
            alt={item.imageAlt}
            fill
            className="object-contain"
            sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
        <h3 className="text-center text-xl font-[family:var(--font-title)] uppercase leading-tight text-[#220707]">
          {item.title}
        </h3>
        {item.href ? (
          <Link
            href={item.href}
            data-analytics-event={preset === "brandLogo" ? "brand_click" : "cta_click"}
            data-analytics-label={item.ctaLabel ?? item.title}
            data-analytics-href={item.href}
            data-analytics-surface="collection-card-logo"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d120e]"
          >
            {item.ctaLabel ?? "View"}
          </Link>
        ) : null}
      </article>
    );
  }

  // Standard: image on top, text below. Matches the current visual system.
  return (
    <article
      key={item.key}
      className="card-lift overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_14px_30px_rgba(28,20,19,0.08)]"
    >
      <div className="relative h-64 overflow-hidden">
        <Image
          src={item.imageSrc}
          alt={item.imageAlt}
          fill
          className="object-cover transition duration-500 hover:scale-105"
          sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div className="p-5">
        {item.eyebrow ? (
          <p className="text-sm uppercase tracking-[0.12em] text-[#7c5b56]">{item.eyebrow}</p>
        ) : null}
        <h3 className="mt-2 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
          {item.title}
        </h3>
        {item.summary ? (
          <p className="mt-3 text-sm leading-7 text-[#4d3b37]">{item.summary}</p>
        ) : null}
        {item.href && item.ctaLabel ? (
          <Link
            href={item.href}
            data-analytics-event="cta_click"
            data-analytics-label={item.ctaLabel ?? item.title}
            data-analytics-href={item.href}
            data-analytics-surface="collection-card-standard"
            className="card-lift-reveal mt-5 inline-flex items-center rounded-full bg-[#E31E24] px-5 py-2.5 text-sm font-semibold text-white"
          >
            {item.ctaLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function renderBrandCards(brands: BrandFeature[], preset: CardPresetVariant) {
  return (
    <div className={CARD_GRID_CLASS}>
      {brands.map((brand) => renderCard(brandToCardItem(brand), preset))}
    </div>
  );
}

function resolveBrandMarqueeBrands(
  block: Extract<PageBlock, { type: "brandMarquee" }>,
  brands: BrandFeature[],
) {
  const publishedBrands = brands
    .filter((brand) => brand.published)
    .sort((left, right) => left.order - right.order);
  const selectedBrandSlugs = block.brandSlugs?.filter(Boolean) ?? [];

  if (selectedBrandSlugs.length > 0) {
    const brandsBySlug = new Map(publishedBrands.map((brand) => [brand.slug, brand]));

    return selectedBrandSlugs
      .map((slug) => brandsBySlug.get(slug))
      .filter((brand): brand is BrandFeature => Boolean(brand));
  }

  return publishedBrands.filter(
    (brand) => !block.categorySlug || brand.categorySlug === block.categorySlug,
  );
}

function renderNewsCards(newsItems: NewsItem[], preset: CardPresetVariant) {
  return (
    <div className={CARD_GRID_CLASS}>
      {newsItems.map((story) => renderCard(newsToCardItem(story), preset))}
    </div>
  );
}

function renderEventCards(events: EventItem[], preset: CardPresetVariant) {
  return (
    <div className={CARD_GRID_CLASS}>
      {events.map((event) => renderCard(eventToCardItem(event), preset))}
    </div>
  );
}

function renderAwardCards(awards: AwardItem[]) {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {awards.map((award) => (
        <article
          key={award.id}
          className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_14px_30px_rgba(28,20,19,0.08)]"
        >
          <div className="relative h-56">
            <Image src={award.image} alt={award.title} fill className="object-cover" sizes="(min-width: 768px) 33vw, 100vw" />
          </div>
          <div className="p-6">
            <p className="text-sm uppercase tracking-[0.16em] text-[#8d120e]">{award.year}</p>
            <h3 className="mt-3 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              {award.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{award.summary}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderPromotionCards(promotions: PromotionItem[]) {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      {promotions.map((promotion) => (
        <PromotionVideoCard key={promotion.id} promotion={promotion} />
      ))}
    </div>
  );
}

function renderCategoryCards(categories: ProductCategory[], appearance?: BlockAppearance) {
  const layoutPreset = appearance?.layoutPreset ?? "standard";
  const bodyTextPreset = appearance?.bodyTextPreset ?? "standard";
  const ctaPreset = appearance?.ctaPreset ?? "solid";

  return (
    <div className={categoryGridLayoutClasses[layoutPreset]}>
      {categories.map((category) => (
        <article
          key={category.slug}
          className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white shadow-[0_14px_30px_rgba(28,20,19,0.08)]"
        >
          <div className="relative h-72 overflow-hidden">
            <Image
              src={category.featuredImage}
              alt={category.name}
              fill
              className="object-cover transition duration-500 hover:scale-105"
              sizes="(min-width: 768px) 33vw, 100vw"
            />
          </div>
          <div className="p-6">
            <h3 className="text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              {category.name}
            </h3>
            <p className={categoryBodyTextClasses[bodyTextPreset]}>{category.description}</p>
            {/*
              Brand red gives the CTA the same optical weight as the header
              search chip and the primary "Read More" buttons on /, so the
              label reads cleanly on the light category card background. The
              previous near-black fill pulled too much weight from the card
              image and made the label feel muddy on low-contrast monitors.
            */}
            <Link
              href={`/products/${category.slug}`}
              data-analytics-event="cta_click"
              data-analytics-label={`View ${category.name}`}
              data-analytics-href={`/products/${category.slug}`}
              data-analytics-surface="category-card"
              className={categoryCtaClasses[ctaPreset]}
            >
              View More
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function renderCollectionGrid(block: Extract<PageBlock, { type: "collectionGrid" }>, content: RidemaxSiteContent) {
  const preset = resolveCardPreset(block.appearance);

  if (block.source === "brands") {
    const brands = limitItems(
      content.brands.filter(
        (brand) => brand.published && (!block.categorySlug || brand.categorySlug === block.categorySlug),
      ),
      block.limit,
    );
    return renderBrandCards(brands, preset);
  }

  if (block.source === "news") {
    const newsItems = limitItems(
      content.newsItems.filter((item) => item.published && (!block.featuredOnly || item.featured)),
      block.limit,
    );
    return renderNewsCards(newsItems, preset);
  }

  if (block.source === "events") {
    const events = limitItems(
      content.events.filter((item) => item.published && (!block.featuredOnly || item.featured)),
      block.limit,
    );
    return renderEventCards(events, preset);
  }

  if (block.source === "awards") {
    const awards = limitItems(content.awards.filter((item) => item.published), block.limit);
    return renderAwardCards(awards);
  }

  if (block.source === "promotions") {
    const promotions = limitItems(
      content.promotions.filter((item) => item.published && (!block.featuredOnly || item.featured)),
      block.limit,
    );
    return renderPromotionCards(promotions);
  }

  return renderCategoryCards(limitItems(content.productCategories, block.limit), block.appearance);
}

function renderFeatureItems(items: ReadonlyArray<{ title: string; summary: string }>) {
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.title}
          className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]"
        >
          <h3 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#8d120e]">
            {item.title}
          </h3>
          <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{item.summary}</p>
        </article>
      ))}
    </div>
  );
}

function renderBlock(
  block: PageBlock,
  content: RidemaxSiteContent,
  initialDepartment: string,
) {
  if (block.type === "hero") {
    const hasHeroImage = Boolean(block.image.src.trim());

    return (
      <HeroBanner
        key={block.id}
        sectionId={`section-${block.id}`}
        image={block.image.src}
        alt={block.image.alt}
        eyebrow={block.eyebrow}
        title={block.title ?? ""}
        summary={block.summary}
        minHeight={block.minHeight}
        align={block.align}
        dark={hasHeroImage ? block.dark : false}
        headingScale={block.appearance?.headingScale}
        headingStyle={block.appearance?.headingStyle}
        textColorScheme={block.appearance?.textColorScheme}
        sectionClassName={sectionBackgroundClass(block.appearance)}
        decoration={<SectionDecoration appearance={block.appearance} />}
      >
        {block.cta ? (
          <Link
            href={block.cta.href}
            data-analytics-event="cta_click"
            data-analytics-label={block.cta.label}
            data-analytics-href={block.cta.href}
            data-analytics-surface="hero-banner"
            className="inline-flex rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {block.cta.label}
          </Link>
        ) : null}
      </HeroBanner>
    );
  }

  if (block.type === "careersIntro") {
    return (
      <section
        key={block.id}
        id={`section-${block.id}`}
        className={sectionClass(block, "pb-20 pt-16 md:pb-24 md:pt-20")}
      >
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[118rem] px-6 md:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <SectionHeader
              eyebrow={block.eyebrow}
              title={block.title}
              summary={block.summary}
              appearance={block.appearance}
            />
          </div>
          {block.images.length > 0 ? (
            <ImageMarquee
              images={block.images}
              direction={block.direction}
              altPrefix={block.altPrefix ?? block.title ?? "Gallery image"}
              className="mt-10 md:mt-12"
            />
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "brandMarquee") {
    const brands = resolveBrandMarqueeBrands(block, content.brands);

    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-10", "border-b border-black/10")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[76rem] px-6 md:px-10">
          <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
          <div className={block.eyebrow || block.title || block.summary ? "mt-8" : ""}>
            <BrandMarquee brands={brands} direction={block.direction} />
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "categoryTiles") {
    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[76rem] px-6 md:px-10">
          <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {block.tiles.map((tile) => (
              <Link
                key={`${block.id}-${tile.href}`}
                href={tile.href}
                className="rounded-2xl border border-black/15 bg-white px-4 py-10 text-center shadow-[0_10px_25px_rgba(26,17,16,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(26,17,16,0.12)]"
              >
                <span className="text-lg font-semibold text-[#4b3b38]">{tile.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "collectionGrid") {
    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
            {block.cta ? (
              <Link
                href={block.cta.href}
                className="inline-flex items-center gap-3 rounded-full bg-[#E31E24] px-6 py-3 text-sm font-semibold text-white"
              >
                {block.cta.label}
              </Link>
            ) : null}
          </div>
          {renderCollectionGrid(block, content)}
        </div>
      </section>
    );
  }

  if (block.type === "searchFilters") {
    return null;
  }

  if (block.type === "featureGrid") {
    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
          <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
          {renderFeatureItems(block.items)}
        </div>
      </section>
    );
  }

  if (block.type === "imageMarquee") {
    // block.background is a raw Tailwind string used by old content records that
    // predate the appearance system. New blocks always have block.appearance.
    const legacyBackground = block.background || "bg-[#f4f4f4]";

    return (
      <section
        key={block.id}
        id={`section-${block.id}`}
        className={block.appearance ? sectionClass(block, "py-14") : `relative overflow-hidden py-14 ${legacyBackground}`}
      >
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[118rem] px-6 md:px-10">
          <div className="text-center">
            <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
          </div>
          <ImageMarquee
            images={block.images}
            direction={block.direction}
            altPrefix={block.altPrefix ?? block.title ?? "Gallery image"}
            className="mt-10"
          />
        </div>
      </section>
    );
  }

  if (block.type === "showcase") {
    // The "Fuel Your Passion" pattern on Careers needs a bespoke bento grid
    // (see globals.css .grid-container / .box-1..box-4) where the right column
    // is one tall image and the bottom row spans full width. A generic 2-col
    // feature grid can't express that layout, so a showcase with 4 feature
    // cards opts into the bento layout. Anything else keeps the
    // simpler side-by-side presentation we already had.
    const useBentoLayout = block.items.length === 4;

    if (useBentoLayout) {
      return (
        <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "pb-16 pt-14")}>
          <SectionDecoration appearance={block.appearance} />
          <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
            <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
            {block.accent ? (
              <p className="mt-3 text-4xl font-semibold leading-none text-[#c10e0a]">{block.accent}</p>
            ) : null}

            <div className="grid-container mt-8 gap-5">
              <article className="box-1 card-lift rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
                <h3 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#8d120e]">
                  {block.items[0].title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{block.items[0].summary}</p>
              </article>

              <article className="box-2 card-lift rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
                <h3 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#8d120e]">
                  {block.items[1].title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{block.items[1].summary}</p>
              </article>

              <div className="box-3 relative min-h-[26rem] overflow-hidden rounded-[1.5rem]">
                <Image
                  src={block.image}
                  alt={block.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                />
              </div>

              <article className="box-4 card-lift rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_26px_rgba(28,20,19,0.06)]">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#8d120e]">
                      {block.items[2].title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{block.items[2].summary}</p>
                  </div>
                  <div>
                    <h3 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#8d120e]">
                      {block.items[3].title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{block.items[3].summary}</p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "pb-16 pt-14")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto grid max-w-[72rem] gap-10 px-6 md:px-10 lg:grid-cols-[1fr_0.9fr]">
          <div className="items-start text-left">
            <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
            {block.accent ? (
              <p className="mt-3 text-4xl font-semibold leading-none text-[#c10e0a]">{block.accent}</p>
            ) : null}
            {renderFeatureItems(block.items)}
          </div>
          <div className="relative min-h-[26rem] overflow-hidden rounded-[1.75rem]">
            <Image
              src={block.image}
              alt={block.imageAlt}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "jobsList") {
    const departments = content.departments.filter((department) => department.published);
    const jobs = content.jobs.filter((job) => job.published);
    const featuredJobs = block.showFeatured ? pickFeaturedJobs(content.jobs) : [];
    const topInsetClass = topDecorationInsetClass(block.appearance);

    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-12")}>
        <SectionDecoration appearance={block.appearance} />
        <div className={`relative mx-auto max-w-[72rem] px-6 md:px-10 ${topInsetClass}`.trim()}>
          <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
          <CareersJobBrowser
            departments={departments}
            jobs={jobs}
            initialDepartment={initialDepartment}
          />
          {block.aboutCta ? (
            <p className="mt-12 text-center text-sm text-[#4d3b37]">
              <Link
                href={block.aboutCta.href}
                className="font-semibold text-[#0b5ed7] underline decoration-2 underline-offset-4 transition-colors hover:text-[#0a3d89]"
              >
                {block.aboutCta.label}
              </Link>
            </p>
          ) : null}
          {featuredJobs.length > 0 ? (
            <div className="mt-12">
              {block.featuredTitle || block.featuredSummary ? (
                <div className="max-w-2xl">
                  {block.featuredTitle ? (
                    <h3 className="text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {block.featuredTitle}
                    </h3>
                  ) : null}
                  {block.featuredSummary ? (
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{block.featuredSummary}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {featuredJobs.map((job) => (
                  <article
                    key={`featured-${job.id}`}
                    className="rounded-[1.5rem] border border-black/10 bg-[#faf8f7] p-5"
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8d120e]">Featured Role</p>
                    <h3 className="mt-3 text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                      {job.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-[#4d3b37]">{job.summary}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "contact") {
    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
          <div className="grid gap-8 rounded-[2rem] bg-white px-6 py-8 shadow-[0_18px_44px_rgba(31,20,19,0.08)] md:px-8 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#6a433d]">{block.eyebrow ?? "Contact"}</p>
              <h2 className="mt-3 text-6xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
                {block.contactTitle}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#4d3b37]">
                {block.summary ?? content.contact.intro}
              </p>
              {/*
                The contact block previously packed Email + Social Media into
                one 2-col grid, which caused the social icons to sit on top of
                the email on narrow widths and clip the trailing ".com". The
                new layout keeps Address+Phone as a 2-col pair (short values
                so they never wrap badly), then promotes Email to its own
                full-width row with a mailto link and uses a hairline divider
                before the social row so the icons can never land on top of
                the email text.
              */}
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#220707]">Address</p>
                  <p className="mt-2 whitespace-pre-line text-[#4d3b37]">{content.contact.address}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#220707]">Phone</p>
                  <p className="mt-2 text-[#4d3b37]">{content.contact.phone}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#220707]">E-Mail</p>
                <p className="mt-2 break-all text-[#4d3b37]">
                  <a
                    href={`mailto:${content.contact.email}`}
                    className="underline decoration-[#8d120e]/40 underline-offset-4 transition hover:text-[#8d120e] hover:decoration-[#8d120e]"
                  >
                    {content.contact.email}
                  </a>
                </p>
              </div>
              <div className="mt-6 border-t border-black/10 pt-5">
                <p className="sr-only">Social Media</p>
                <SocialLinks links={content.contact.socials} dark />
              </div>
            </div>
            {block.showForm ? <ContactForm /> : null}
          </div>
          {block.showMap ? (
            <div className="mt-10">
              <MapEmbed
                query={content.contact.mapQuery}
                zoom={content.contact.mapZoom}
                className="border-x-0 border-b-0 border-t border-black/10"
              />
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (block.type === "categorySections") {
    const category = content.productCategories.find((item) => item.slug === block.categorySlug);

    if (!category) {
      return null;
    }

    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
          <SectionHeader
            eyebrow={block.eyebrow}
            title={block.title ?? category.sectionTitle}
            summary={block.summary ?? category.sectionSummary}
            appearance={block.appearance}
          />
          <AlternatingFeatureRows sections={category.sections} />
        </div>
      </section>
    );
  }

  if (block.type === "projectList") {
    const projects = content.projectFeatures.filter((project) => project.published);

    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
          <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
          <div className="mt-10 space-y-14">
            {projects.map((project, index) => {
              const reverse = index % 2 === 1;

              return (
                <article key={project.id} className="border-b border-black/20 pb-14 last:border-b-0 last:pb-0">
                  <div className={`grid items-center gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
                    <div className="relative h-[18rem] overflow-hidden rounded-sm bg-[#f2efec] sm:h-[22rem]">
                      <Image src={project.image} alt={project.title} fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
                    </div>
                    <div className="max-w-lg">
                      <p className="text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">{project.numberLabel}</p>
                      <h3 className="mt-3 text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">{project.title}</h3>
                      <p className="mt-5 text-base leading-8 text-[#4d3b37]">{project.summary}</p>
                      <Link href={project.href} className="mt-6 inline-flex items-center bg-[#58413d] px-5 py-2.5 text-sm font-semibold text-white">
                        View More
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === "calendar") {
    const events = content.events.filter((event) => event.published);
    const calendarItems = buildCalendarItems(events);

    return (
      <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16", "", "surface-2")}>
        <SectionDecoration appearance={block.appearance} />
        <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
          <div className="flex items-center justify-between">
            <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
            <p className="text-sm uppercase tracking-[0.14em] text-[#6a433d]">{monthLabel(events)}</p>
          </div>
          <div className="mt-8 grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="px-3 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarItems.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`min-h-24 rounded-2xl border p-3 ${item.inMonth ? "border-black/10 bg-white" : "border-transparent bg-white/35 text-black/35"}`}
              >
                <div className="text-sm font-semibold">{item.label}</div>
                {item.title ? (
                  <>
                    <div className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#8d120e] sm:hidden">
                      Event
                    </div>
                    <div className="mt-2 hidden text-xs leading-5 text-[#8d120e] sm:block">
                      {item.title}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section key={block.id} id={`section-${block.id}`} className={sectionClass(block, "py-16")}>
      <SectionDecoration appearance={block.appearance} />
      <div className="relative mx-auto max-w-[72rem] px-6 md:px-10">
        <SectionHeader eyebrow={block.eyebrow} title={block.title} summary={block.summary} appearance={block.appearance} />
      </div>
    </section>
  );
}

export function MarketingPageRenderer({
  content,
  page,
  initialDepartment = "",
}: MarketingPageRendererProps) {
  return (
    <main>
      {page.blocks.map((block) => renderBlock(block, content, initialDepartment))}
    </main>
  );
}
