import { z } from "zod";
import { isSupportedVideoUrl } from "@/lib/video-embed";

const linkItemSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const navLinkSchema = linkItemSchema.extend({
  children: z.array(linkItemSchema).optional(),
});

const heroImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  eyebrow: z.string().optional(),
});

const motionDirectionSchema = z.enum(["right-to-left", "left-to-right"]);
const sectionBackgroundVariantSchema = z.enum([
  "surface-1",
  "surface-2",
  "surface-3",
  "brand-red",
  "deep-brand-red",
  "ink",
]);
const sectionDecorationSchema = z.object({
  style: z.enum(["none", "wave", "curve", "diagonal", "blob"]).optional(),
  position: z.enum(["top", "bottom"]).optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
  color: z.enum(["brand-red", "deep-brand-red", "wine", "surface-1", "surface-2", "surface-3"]).optional(),
});
const cardPresetVariantSchema = z.enum(["standard", "imageOverlay", "brandLogo"]);
const sectionHeadingScaleSchema = z.enum(["compact", "standard", "display"]);
const sectionHeadingStyleSchema = z.enum(["standard", "large", "emphasis", "minimal"]);
const sectionTextToneSchema = z.enum(["default", "muted", "brand"]);
const sectionTextColorSchemeSchema = z.enum(["default", "dark", "light", "muted", "brand"]);
const sectionLayoutPresetSchema = z.enum(["standard", "compact", "feature"]);
const sectionBodyTextPresetSchema = z.enum(["standard", "short", "editorial"]);
const sectionCtaPresetSchema = z.enum(["solid", "outline", "text"]);
const sectionAppearancePresetSchema = z.enum([
  "custom",
  "deep-brand-curve",
  "deep-brand-wave",
  "light-curve-top",
  "warm-wave-top",
  "ink-spotlight",
]);
const blockAppearanceSchema = z.object({
  preset: sectionAppearancePresetSchema.optional(),
  background: sectionBackgroundVariantSchema.optional(),
  decoration: sectionDecorationSchema.optional(),
  cardPreset: cardPresetVariantSchema.optional(),
  headingScale: sectionHeadingScaleSchema.optional(),
  headingStyle: sectionHeadingStyleSchema.optional(),
  textTone: sectionTextToneSchema.optional(),
  textColorScheme: sectionTextColorSchemeSchema.optional(),
  layoutPreset: sectionLayoutPresetSchema.optional(),
  bodyTextPreset: sectionBodyTextPresetSchema.optional(),
  ctaPreset: sectionCtaPresetSchema.optional(),
});
const socialPlatformSchema = z.enum([
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "tiktok",
  "youtube",
]);

const socialLinkSchema = z.object({
  platform: socialPlatformSchema,
  label: z.string(),
  href: z.string(),
});

const shopLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const contactSettingsSchema = z.object({
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  mapQuery: z.string(),
  mapZoom: z.number().int(),
  intro: z.string(),
  socials: z.array(socialLinkSchema),
  shops: z.array(shopLinkSchema),
});

const siteSettingsSchema = z.object({
  siteName: z.string(),
  logoSrc: z.string(),
  // Optional in the wire format so older content bundles keep parsing; the
  // header/footer handle an empty string by falling back to `logoSrc`.
  logoLightSrc: z.string().default(""),
  searchPlaceholder: z.string(),
  footerDescription: z.string(),
});

const brandFeatureSchema = z.object({
  id: z.string(),
  slug: z.string(),
  label: z.string(),
  title: z.string(),
  summary: z.string(),
  image: z.string(),
  href: z.string(),
  categorySlug: z.string(),
  tags: z.array(z.string()),
  published: z.boolean(),
  order: z.number().int(),
});

const categorySectionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  paragraphs: z.array(z.string()),
  published: z.boolean(),
  order: z.number().int(),
});

const productCategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  heroTitle: z.string(),
  heroSummary: z.string(),
  heroImage: heroImageSchema,
  featuredImage: z.string(),
  browseTitle: z.string(),
  browseSummary: z.string(),
  sectionTitle: z.string(),
  sectionSummary: z.string(),
  sections: z.array(categorySectionSchema),
});

const productItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  categorySlug: z.string(),
  brand: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
  sku: z.string(),
  image: z.string(),
  gallery: z.array(z.string()),
  sizes: z.array(z.string()),
  tags: z.array(z.string()),
  searchKeywords: z.array(z.string()),
  published: z.boolean(),
  order: z.number().int(),
});

const externalCatalogCategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
});

// `readOnly` is a literal `true` — see CatalogSourceSettings in ridemax-types.
// The schema rejects `false` at parse time so catalog edits stay snapshot-based
// instead of turning this app into a direct upstream product writer.
const catalogSourceSchema = z.object({
  mode: z.enum(["local-json", "remote-api"]),
  provider: z.string(),
  endpoint: z.string(),
  readOnly: z.literal(true),
  syncStrategy: z.enum(["api-based-ingestion", "scheduled-sync", "queue-worker"]),
  lastSyncedAt: z.string().optional(),
  fallbackPath: z.string().optional(),
  notes: z.array(z.string()),
});

const externalProductCatalogSchema = z.object({
  source: catalogSourceSchema,
  categories: z.array(externalCatalogCategorySchema),
  items: z.array(productItemSchema),
});

const newsItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  summary: z.string(),
  image: z.string(),
  published: z.boolean(),
  featured: z.boolean(),
  order: z.number().int(),
});

const eventItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  teaserDate: z.string(),
  location: z.string(),
  venue: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  summary: z.string(),
  description: z.string(),
  image: z.string(),
  detailImage: z.string(),
  published: z.boolean(),
  featured: z.boolean(),
  order: z.number().int(),
  shareLinks: z.object({
    facebook: z.string(),
    x: z.string(),
    linkedin: z.string(),
  }),
});

const promotionItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  videoUrl: z.string().refine((value) => isSupportedVideoUrl(value), {
    message: "Promotions must use a supported YouTube or Vimeo URL.",
  }),
  thumbnail: z.string(),
  publishDate: z.string(),
  ctaLabel: z.string().optional(),
  ctaHref: z.string().optional(),
  tags: z.array(z.string()),
  published: z.boolean(),
  featured: z.boolean(),
  order: z.number().int(),
});

const awardItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  year: z.string(),
  title: z.string(),
  summary: z.string(),
  image: z.string(),
  published: z.boolean(),
  order: z.number().int(),
});

const projectFeatureSchema = z.object({
  id: z.string(),
  numberLabel: z.string(),
  title: z.string(),
  summary: z.string(),
  image: z.string(),
  href: z.string(),
  published: z.boolean(),
  order: z.number().int(),
});

const departmentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  published: z.boolean(),
  order: z.number().int(),
});

const jobOpeningSchema = z.object({
  id: z.string(),
  slug: z.string(),
  departmentSlug: z.string(),
  title: z.string(),
  location: z.string(),
  type: z.string(),
  summary: z.string(),
  description: z.string(),
  published: z.boolean(),
  featured: z.boolean(),
  order: z.number().int(),
});

const featureCardSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

const pageSlugSchema = z.enum([
  "home",
  "products",
  "tires",
  "rims",
  "accessories",
  "careers",
  "about",
  "events-awards",
  "news",
  "events",
  "awards",
  "promotions",
  "search",
]);

const blockBaseSchema = {
  id: z.string(),
  order: z.number().int(),
  title: z.string().optional(),
  summary: z.string().optional(),
  eyebrow: z.string().optional(),
  appearance: blockAppearanceSchema.optional(),
};

const heroBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("hero"),
  image: heroImageSchema,
  align: z.enum(["left", "center"]).optional(),
  dark: z.boolean().optional(),
  minHeight: z.string().optional(),
  cta: linkItemSchema.optional(),
  tone: z.enum(["default", "accent"]).optional(),
});

const careersIntroBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("careersIntro"),
  images: z.array(z.string()),
  direction: motionDirectionSchema,
  altPrefix: z.string().optional(),
});

const brandMarqueeBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("brandMarquee"),
  direction: motionDirectionSchema,
  categorySlug: z.string().optional(),
  brandSlugs: z.array(z.string()).optional(),
});

const categoryTilesBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("categoryTiles"),
  tiles: z.array(linkItemSchema),
});

const collectionGridBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("collectionGrid"),
  source: z.enum([
    "brands",
    "news",
    "events",
    "awards",
    "promotions",
    "catalogCategories",
  ]),
  variant: z.enum([
    "brands",
    "news",
    "events",
    "awards",
    "promotions",
    "categories",
  ]),
  limit: z.number().int().optional(),
  featuredOnly: z.boolean().optional(),
  categorySlug: z.string().optional(),
  cta: linkItemSchema.optional(),
});

const featureGridBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("featureGrid"),
  items: z.array(featureCardSchema),
});

const imageMarqueeBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("imageMarquee"),
  images: z.array(z.string()),
  direction: motionDirectionSchema,
  altPrefix: z.string().optional(),
  background: z.string().optional(),
});

const showcaseBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("showcase"),
  accent: z.string().optional(),
  image: z.string(),
  imageAlt: z.string(),
  items: z.array(featureCardSchema),
});

const jobsListBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("jobsList"),
  featuredTitle: z.string().optional(),
  featuredSummary: z.string().optional(),
  aboutCta: linkItemSchema.optional(),
  showFeatured: z.boolean().optional(),
});

const contactBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("contact"),
  contactTitle: z.string(),
  showForm: z.boolean(),
  showMap: z.boolean(),
});

const categorySectionsBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("categorySections"),
  categorySlug: z.string(),
});

const projectListBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("projectList"),
});

const calendarBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("calendar"),
});

const searchFiltersBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("searchFilters"),
  categoryOptions: z.array(z.string()),
  sortOptions: z.array(z.string()),
  quickMatchesLabel: z.string().optional(),
  maxSuggestions: z.number().int().optional(),
});

const richTextBlockSchema = z.object({
  ...blockBaseSchema,
  type: z.literal("richText"),
});

const pageBlockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  careersIntroBlockSchema,
  brandMarqueeBlockSchema,
  categoryTilesBlockSchema,
  collectionGridBlockSchema,
  featureGridBlockSchema,
  imageMarqueeBlockSchema,
  showcaseBlockSchema,
  jobsListBlockSchema,
  contactBlockSchema,
  categorySectionsBlockSchema,
  projectListBlockSchema,
  calendarBlockSchema,
  searchFiltersBlockSchema,
  richTextBlockSchema,
]);

const pageDocumentSchema = z.object({
  id: z.string(),
  slug: pageSlugSchema,
  title: z.string(),
  summary: z.string().optional(),
  blocks: z.array(pageBlockSchema),
});

export const siteContentSchema = z.object({
  navigation: z.array(navLinkSchema),
  site: siteSettingsSchema,
  contact: contactSettingsSchema,
  pages: z.array(pageDocumentSchema),
  productCategories: z.array(productCategorySchema),
  catalogSource: catalogSourceSchema,
  brands: z.array(brandFeatureSchema),
  promotions: z.array(promotionItemSchema),
  departments: z.array(departmentSchema),
  jobs: z.array(jobOpeningSchema),
  newsItems: z.array(newsItemSchema),
  events: z.array(eventItemSchema),
  awards: z.array(awardItemSchema),
  projectFeatures: z.array(projectFeatureSchema),
});

export const contactMessageInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(5000),
});

export const jobApplicationInputSchema = z.object({
  jobSlug: z.string().trim().min(1).max(200),
  jobTitle: z.string().trim().max(200).default(""),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().max(5000).default(""),
  resumeUrl: z.string().trim().url().max(500).or(z.literal("")).default(""),
});

export type JobApplicationInput = z.infer<typeof jobApplicationInputSchema>;

export { externalProductCatalogSchema };
