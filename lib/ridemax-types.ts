/**
 * Central content types for the Ridemax marketing site.
 * The CMS bundle owns editorial structure and display rules,
 * while the product catalog is treated as a read-only external source.
 */

export type LinkItem = {
  label: string;
  href: string;
};

export type NavLink = LinkItem & {
  children?: LinkItem[];
};

export type HeroImage = {
  src: string;
  alt: string;
  eyebrow?: string;
};

export type MotionDirection = "right-to-left" | "left-to-right";

export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "tiktok"
  | "youtube";

export type SocialLink = {
  platform: SocialPlatform;
  label: string;
  href: string;
};

export type ShopLink = {
  label: string;
  href: string;
};

export type ContactSettings = {
  address: string;
  phone: string;
  email: string;
  mapQuery: string;
  mapZoom: number;
  intro: string;
  socials: SocialLink[];
  shops: ShopLink[];
};

export type SiteSettings = {
  siteName: string;
  /**
   * Logo displayed on light surfaces (scrolled header, any light background).
   * Stored as an asset URL so editors control the brand mark without code changes.
   */
  logoSrc: string;
  /**
   * Logo displayed on dark surfaces (top-of-page header, footer).
   * When empty, the header/footer fall back to `logoSrc`.
   */
  logoLightSrc: string;
  searchPlaceholder: string;
  footerDescription: string;
};

export type BrandFeature = {
  id: string;
  slug: string;
  label: string;
  title: string;
  summary: string;
  image: string;
  href: string;
  categorySlug: string;
  tags: string[];
  published: boolean;
  order: number;
};

export type CategorySection = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  paragraphs: string[];
  published: boolean;
  order: number;
};

/**
 * Editorial configuration for a catalog category page.
 * This is CMS-managed display content, not the external catalog inventory itself.
 */
export type ProductCategory = {
  slug: string;
  name: string;
  description: string;
  heroTitle: string;
  heroSummary: string;
  heroImage: HeroImage;
  featuredImage: string;
  browseTitle: string;
  browseSummary: string;
  sectionTitle: string;
  sectionSummary: string;
  sections: CategorySection[];
};

/**
 * Read-only product data from the external catalog source.
 *
 * This shape is the public contract the site renders against, regardless of
 * whether the current catalog mode is `local-json` or `remote-api`. The admin
 * surface MUST NOT write to any field here — product data is owned by the
 * warehouse/ERP system. Any mutation path introduced here is a design bug and
 * breaks the composable-commerce invariant documented in `docs/architecture.md`.
 */
export type ProductItem = {
  /**
   * Stable identifier owned by the warehouse/catalog system. The value must
   * persist across syncs and match the warehouse's primary key (or a stable
   * projection of it). Do not regenerate on import — downstream references
   * (analytics, cart lines, URLs that outlive a sync window) rely on stability.
   */
  id: string;
  slug: string;
  categorySlug: string;
  brand: string;
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  sku: string;
  image: string;
  gallery: string[];
  sizes: string[];
  tags: string[];
  searchKeywords: string[];
  published: boolean;
  order: number;
};

export type ExternalCatalogCategory = {
  slug: string;
  name: string;
  description: string;
};

export type CatalogSourceMode = "local-json" | "remote-api";

export type CatalogSyncStrategy =
  | "api-based-ingestion"
  | "scheduled-sync"
  | "queue-worker";

/**
 * Settings describing how the site is talking to the upstream catalog today.
 * `readOnly` is a literal `true` because the site is never authoritative for
 * product data; if the catalog ever needs writes they happen upstream and
 * flow back through sync. Keeping the flag at the type level prevents a
 * "just this once" mutation path from slipping into admin code.
 */
export type CatalogSourceSettings = {
  mode: CatalogSourceMode;
  provider: string;
  endpoint: string;
  readOnly: true;
  syncStrategy: CatalogSyncStrategy;
  lastSyncedAt?: string;
  fallbackPath?: string;
  notes: readonly string[];
};

/**
 * The snapshot the public site renders against. Arrays are `readonly` so
 * callers use non-mutating operations (filter/find/map/slice) — this is the
 * seam that keeps the app honest about the CMS-vs-catalog split.
 */
export type ExternalProductCatalog = {
  source: CatalogSourceSettings;
  categories: readonly ExternalCatalogCategory[];
  items: readonly ProductItem[];
};

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  summary: string;
  image: string;
  published: boolean;
  featured: boolean;
  order: number;
};

export type ShareLinks = {
  facebook: string;
  x: string;
  linkedin: string;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  teaserDate: string;
  location: string;
  venue: string;
  startAt: string;
  endAt: string;
  summary: string;
  description: string;
  image: string;
  detailImage: string;
  published: boolean;
  featured: boolean;
  order: number;
  shareLinks: ShareLinks;
};

export type PromotionItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  publishDate: string;
  ctaLabel?: string;
  ctaHref?: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  order: number;
};

export type AwardItem = {
  id: string;
  slug: string;
  year: string;
  title: string;
  summary: string;
  image: string;
  published: boolean;
  order: number;
};

export type ProjectFeature = {
  id: string;
  numberLabel: string;
  title: string;
  summary: string;
  image: string;
  href: string;
  published: boolean;
  order: number;
};

export type Department = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  order: number;
};

export type JobOpening = {
  id: string;
  slug: string;
  departmentSlug: string;
  title: string;
  location: string;
  type: string;
  summary: string;
  description: string;
  published: boolean;
  featured: boolean;
  order: number;
};

export type FeatureCard = {
  title: string;
  summary: string;
};

export type ContentPageSlug =
  | "home"
  | "products"
  | "careers"
  | "about"
  | "events-awards"
  | "news"
  | "events"
  | "awards"
  | "promotions";

export type PageBlockType =
  | "hero"
  | "brandMarquee"
  | "categoryTiles"
  | "collectionGrid"
  | "featureGrid"
  | "imageMarquee"
  | "showcase"
  | "jobsList"
  | "contact"
  | "categorySections"
  | "projectList"
  | "calendar"
  | "richText";

export type PageBlockBase = {
  id: string;
  type: PageBlockType;
  order: number;
  title?: string;
  summary?: string;
  eyebrow?: string;
};

export type HeroBlock = PageBlockBase & {
  type: "hero";
  image: HeroImage;
  align?: "left" | "center";
  dark?: boolean;
  minHeight?: string;
  cta?: LinkItem;
  tone?: "default" | "accent";
};

export type BrandMarqueeBlock = PageBlockBase & {
  type: "brandMarquee";
  direction: MotionDirection;
  categorySlug?: string;
};

export type CategoryTilesBlock = PageBlockBase & {
  type: "categoryTiles";
  tiles: LinkItem[];
};

export type CollectionGridSource =
  | "brands"
  | "news"
  | "events"
  | "awards"
  | "promotions"
  | "catalogCategories";

export type CollectionGridVariant =
  | "brands"
  | "news"
  | "events"
  | "awards"
  | "promotions"
  | "categories";

export type CollectionGridBlock = PageBlockBase & {
  type: "collectionGrid";
  source: CollectionGridSource;
  variant: CollectionGridVariant;
  limit?: number;
  featuredOnly?: boolean;
  categorySlug?: string;
  cta?: LinkItem;
};

export type FeatureGridBlock = PageBlockBase & {
  type: "featureGrid";
  items: FeatureCard[];
};

export type ImageMarqueeBlock = PageBlockBase & {
  type: "imageMarquee";
  images: string[];
  direction: MotionDirection;
  altPrefix?: string;
  background?: string;
};

export type ShowcaseBlock = PageBlockBase & {
  type: "showcase";
  accent?: string;
  image: string;
  imageAlt: string;
  items: FeatureCard[];
};

export type JobsListBlock = PageBlockBase & {
  type: "jobsList";
  featuredTitle?: string;
  featuredSummary?: string;
  aboutCta?: LinkItem;
  showFeatured?: boolean;
};

export type ContactBlock = PageBlockBase & {
  type: "contact";
  contactTitle: string;
  showForm: boolean;
  showMap: boolean;
};

export type CategorySectionsBlock = PageBlockBase & {
  type: "categorySections";
  categorySlug: string;
};

export type ProjectListBlock = PageBlockBase & {
  type: "projectList";
};

export type CalendarBlock = PageBlockBase & {
  type: "calendar";
};

export type RichTextBlock = PageBlockBase & {
  type: "richText";
};

export type PageBlock =
  | HeroBlock
  | BrandMarqueeBlock
  | CategoryTilesBlock
  | CollectionGridBlock
  | FeatureGridBlock
  | ImageMarqueeBlock
  | ShowcaseBlock
  | JobsListBlock
  | ContactBlock
  | CategorySectionsBlock
  | ProjectListBlock
  | CalendarBlock
  | RichTextBlock;

export type PageDocument = {
  id: string;
  slug: ContentPageSlug;
  title: string;
  summary?: string;
  blocks: PageBlock[];
};

export type SearchRecord = {
  title: string;
  href: string;
  summary: string;
  kind:
    | "Page"
    | "Category"
    | "Product"
    | "News"
    | "Event"
    | "Award"
    | "Job"
    | "Promotion";
  image?: string;
  keywords?: string[];
};

export type MediaAssetStorageMode = "s3" | "supabase" | "local";

export type MediaAsset = {
  id: string;
  fileName: string;
  url: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
  storageKey: string;
  storageMode: MediaAssetStorageMode;
};

/**
 * The CMS bundle owns page structure, reusable collections, and display rules.
 * Product inventory lives in a separate read-only catalog source.
 */
export type RidemaxSiteContent = {
  navigation: NavLink[];
  site: SiteSettings;
  contact: ContactSettings;
  pages: PageDocument[];
  productCategories: ProductCategory[];
  catalogSource: CatalogSourceSettings;
  brands: BrandFeature[];
  promotions: PromotionItem[];
  departments: Department[];
  jobs: JobOpening[];
  newsItems: NewsItem[];
  events: EventItem[];
  awards: AwardItem[];
  projectFeatures: ProjectFeature[];
};

export type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  createdAt: string;
};

export type ContactMessageInput = Omit<ContactMessage, "id" | "createdAt">;
