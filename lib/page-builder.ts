import type {
  ContentPageSlug,
  PageBlock,
  PageBlockType,
  PageDocument,
  RidemaxSiteContent,
} from "@/lib/ridemax-types";

export type SelectOption = {
  label: string;
  value: string;
};

export type PageBlockFieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "checkbox" | "select";
  options?: SelectOption[];
};

export const motionDirectionOptions: SelectOption[] = [
  { label: "Right to left", value: "right-to-left" },
  { label: "Left to right", value: "left-to-right" },
];

export const pageSlugOptions: SelectOption[] = [
  { label: "Home", value: "home" },
  { label: "Products", value: "products" },
  { label: "Careers", value: "careers" },
  { label: "About", value: "about" },
  { label: "Events and Awards", value: "events-awards" },
  { label: "News", value: "news" },
  { label: "Events", value: "events" },
  { label: "Awards", value: "awards" },
  { label: "Promotions", value: "promotions" },
];

export const pageBlockTypeOptions: SelectOption[] = [
  { label: "Hero", value: "hero" },
  { label: "Brand Marquee", value: "brandMarquee" },
  { label: "Category Tiles", value: "categoryTiles" },
  { label: "Collection Grid", value: "collectionGrid" },
  { label: "Feature Grid", value: "featureGrid" },
  { label: "Image Marquee", value: "imageMarquee" },
  { label: "Showcase", value: "showcase" },
  { label: "Jobs List", value: "jobsList" },
  { label: "Contact", value: "contact" },
  { label: "Category Sections", value: "categorySections" },
  { label: "Project List", value: "projectList" },
  { label: "Calendar", value: "calendar" },
  { label: "Rich Text", value: "richText" },
];

function pageLabel(slug: ContentPageSlug) {
  return pageSlugOptions.find((option) => option.value === slug)?.label ?? slug;
}

function blockLabel(type: PageBlockType) {
  return pageBlockTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function createPageDocumentTemplate(slug: ContentPageSlug): PageDocument {
  return {
    id: `page-${slug}`,
    slug,
    title: pageLabel(slug),
    summary: "",
    blocks: [],
  };
}

export function createPageBlockTemplate(type: PageBlockType): PageBlock {
  const base = {
    id: `${type}-${Date.now()}`,
    type,
    order: 1,
    title: "",
    summary: "",
    eyebrow: "",
  };

  switch (type) {
    case "hero":
      return {
        ...base,
        type,
        image: {
          src: "",
          alt: "",
        },
        align: "center",
        dark: true,
        minHeight: "min-h-[28rem]",
        tone: "default",
      };
    case "brandMarquee":
      return {
        ...base,
        type,
        direction: "right-to-left",
        categorySlug: "",
      };
    case "categoryTiles":
      return {
        ...base,
        type,
        tiles: [],
      };
    case "collectionGrid":
      return {
        ...base,
        type,
        source: "news",
        variant: "news",
        limit: 3,
        featuredOnly: false,
      };
    case "featureGrid":
      return {
        ...base,
        type,
        items: [],
      };
    case "imageMarquee":
      return {
        ...base,
        type,
        images: [],
        direction: "right-to-left",
        altPrefix: "Gallery image",
        background: "",
      };
    case "showcase":
      return {
        ...base,
        type,
        accent: "",
        image: "",
        imageAlt: "",
        items: [],
      };
    case "jobsList":
      return {
        ...base,
        type,
        featuredTitle: "",
        featuredSummary: "",
        showFeatured: true,
      };
    case "contact":
      return {
        ...base,
        type,
        contactTitle: "Get In Touch",
        showForm: true,
        showMap: false,
      };
    case "categorySections":
      return {
        ...base,
        type,
        categorySlug: "tires",
      };
    case "projectList":
      return {
        ...base,
        type,
      };
    case "calendar":
      return {
        ...base,
        type,
      };
    case "richText":
      return {
        ...base,
        type,
      };
  }
}

export function getPageDocument(
  content: Pick<RidemaxSiteContent, "pages">,
  slug: ContentPageSlug,
) {
  return content.pages.find((page) => page.slug === slug) ?? null;
}

export function getHeroBlock(page: PageDocument | null) {
  if (!page) {
    return null;
  }

  const heroBlock = page.blocks.find((block) => block.type === "hero");
  return heroBlock?.type === "hero" ? heroBlock : null;
}

export function getPageBlockLabel(block: Pick<PageBlock, "type">) {
  return blockLabel(block.type);
}

export function getPageBlockFields(block: PageBlock): PageBlockFieldConfig[] {
  const common: PageBlockFieldConfig[] = [
    { key: "title", label: "Title", type: "text" },
    { key: "summary", label: "Summary", type: "textarea" },
    { key: "eyebrow", label: "Eyebrow", type: "text" },
  ];

  switch (block.type) {
    case "hero":
      return [
        ...common,
        { key: "image.src", label: "Image URL", type: "text" },
        { key: "image.alt", label: "Image Alt", type: "text" },
        {
          key: "align",
          label: "Align",
          type: "select",
          options: [
            { label: "Center", value: "center" },
            { label: "Left", value: "left" },
          ],
        },
        { key: "dark", label: "Dark Overlay", type: "checkbox" },
        { key: "minHeight", label: "Min Height Class", type: "text" },
        {
          key: "tone",
          label: "Tone",
          type: "select",
          options: [
            { label: "Default", value: "default" },
            { label: "Accent", value: "accent" },
          ],
        },
        { key: "cta.label", label: "CTA Label", type: "text" },
        { key: "cta.href", label: "CTA Link", type: "text" },
      ];
    case "brandMarquee":
      return [
        ...common,
        { key: "categorySlug", label: "Category Filter", type: "text" },
        {
          key: "direction",
          label: "Direction",
          type: "select",
          options: motionDirectionOptions,
        },
      ];
    case "categoryTiles":
      return [
        ...common,
        {
          key: "tilesText",
          label: "Tiles (Label | /path per line)",
          type: "textarea",
        },
      ];
    case "collectionGrid":
      return [
        ...common,
        {
          key: "source",
          label: "Collection",
          type: "select",
          options: [
            { label: "Brands", value: "brands" },
            { label: "News", value: "news" },
            { label: "Events", value: "events" },
            { label: "Awards", value: "awards" },
            { label: "Promotions", value: "promotions" },
            { label: "Catalog Categories", value: "catalogCategories" },
          ],
        },
        {
          key: "variant",
          label: "Card Style",
          type: "select",
          options: [
            { label: "Brands", value: "brands" },
            { label: "News", value: "news" },
            { label: "Events", value: "events" },
            { label: "Awards", value: "awards" },
            { label: "Promotions", value: "promotions" },
            { label: "Categories", value: "categories" },
          ],
        },
        { key: "limit", label: "Limit", type: "text" },
        { key: "featuredOnly", label: "Featured Only", type: "checkbox" },
        { key: "categorySlug", label: "Category Filter", type: "text" },
        { key: "cta.label", label: "CTA Label", type: "text" },
        { key: "cta.href", label: "CTA Link", type: "text" },
      ];
    case "featureGrid":
      return [
        ...common,
        {
          key: "itemsText",
          label: "Items (Title | Summary per line)",
          type: "textarea",
        },
      ];
    case "imageMarquee":
      return [
        ...common,
        {
          key: "imagesText",
          label: "Images (one URL per line)",
          type: "textarea",
        },
        {
          key: "direction",
          label: "Direction",
          type: "select",
          options: motionDirectionOptions,
        },
        { key: "altPrefix", label: "Alt Prefix", type: "text" },
        { key: "background", label: "Background Class", type: "text" },
      ];
    case "showcase":
      return [
        ...common,
        { key: "accent", label: "Accent Text", type: "text" },
        { key: "image", label: "Image URL", type: "text" },
        { key: "imageAlt", label: "Image Alt", type: "text" },
        {
          key: "itemsText",
          label: "Items (Title | Summary per line)",
          type: "textarea",
        },
      ];
    case "jobsList":
      return [
        ...common,
        { key: "featuredTitle", label: "Featured Title", type: "text" },
        { key: "featuredSummary", label: "Featured Summary", type: "textarea" },
        { key: "aboutCta.label", label: "About CTA Label", type: "text" },
        { key: "aboutCta.href", label: "About CTA Link", type: "text" },
        { key: "showFeatured", label: "Show Featured", type: "checkbox" },
      ];
    case "contact":
      return [
        ...common,
        { key: "contactTitle", label: "Contact Title", type: "text" },
        { key: "showForm", label: "Show Form", type: "checkbox" },
        { key: "showMap", label: "Show Map", type: "checkbox" },
      ];
    case "categorySections":
      return [
        ...common,
        { key: "categorySlug", label: "Category Slug", type: "text" },
      ];
    case "projectList":
    case "calendar":
    case "richText":
      return common;
  }
}
