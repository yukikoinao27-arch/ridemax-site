import type {
  BlockAppearance,
  CollectionGridSource,
  ContentPageSlug,
  PageBlock,
  PageBlockType,
  PageDocument,
  RidemaxSiteContent,
  SectionAppearancePreset,
} from "@/lib/ridemax-types";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type PageBlockFieldConfig = {
  key: string;
  label: string;
  type: "text" | "textarea" | "checkbox" | "select" | "image" | "image-list" | "brand-list";
  options?: SelectOption[];
  helpText?: string;
};

export const motionDirectionOptions: SelectOption[] = [
  { label: "Right to left", value: "right-to-left" },
  { label: "Left to right", value: "left-to-right" },
];

export const sectionBackgroundOptions: SelectOption[] = [
  { label: "Default white", value: "surface-1" },
  { label: "Soft gray", value: "surface-2" },
  { label: "Warm tint", value: "surface-3" },
  { label: "Brand red", value: "brand-red" },
  { label: "Deep brand red", value: "deep-brand-red" },
  { label: "Charcoal", value: "ink" },
];

export const sectionDecorationStyleOptions: SelectOption[] = [
  { label: "None", value: "none" },
  { label: "Wave", value: "wave" },
  { label: "Curve", value: "curve" },
  { label: "Diagonal", value: "diagonal" },
  { label: "Organic shape", value: "blob" },
];

export const sectionDecorationColorOptions: SelectOption[] = [
  { label: "Brand red", value: "brand-red" },
  { label: "Deep brand red", value: "deep-brand-red" },
  { label: "Dark wine", value: "wine" },
  { label: "Default white", value: "surface-1" },
  { label: "Soft gray", value: "surface-2" },
  { label: "Warm tint", value: "surface-3" },
];

export const sectionAppearancePresetOptions: SelectOption[] = [
  { label: "Custom", value: "custom" },
  { label: "Deep Brand Curve", value: "deep-brand-curve" },
  { label: "Deep Brand Wave", value: "deep-brand-wave" },
  { label: "Light Curve Top", value: "light-curve-top" },
  { label: "Warm Wave Top", value: "warm-wave-top" },
  { label: "Ink Spotlight", value: "ink-spotlight" },
];

export const sectionDecorationPositionOptions: SelectOption[] = [
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

export const sectionDecorationSizeOptions: SelectOption[] = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
];

export const heroMinHeightOptions: SelectOption[] = [
  { label: "Compact", value: "min-h-[18rem]" },
  { label: "Standard", value: "min-h-[26rem]" },
  { label: "Tall", value: "min-h-[28rem]" },
  { label: "Feature", value: "min-h-[38rem]" },
];

export const sectionHeadingScaleOptions: SelectOption[] = [
  { label: "Compact", value: "compact" },
  { label: "Standard", value: "standard" },
  { label: "Display", value: "display" },
];

export const sectionHeadingStyleOptions: SelectOption[] = [
  { label: "Standard", value: "standard" },
  { label: "Large", value: "large" },
  { label: "Emphasis", value: "emphasis" },
  { label: "Minimal", value: "minimal" },
];

export const sectionTextToneOptions: SelectOption[] = [
  { label: "Default", value: "default" },
  { label: "Muted", value: "muted" },
  { label: "Brand red", value: "brand" },
];

export const sectionTextColorSchemeOptions: SelectOption[] = [
  { label: "Default", value: "default" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Muted", value: "muted" },
  { label: "Brand", value: "brand" },
];

export const sectionLayoutPresetOptions: SelectOption[] = [
  { label: "Balanced", value: "standard" },
  { label: "Compact", value: "compact" },
  { label: "Feature", value: "feature" },
];

export const sectionBodyTextPresetOptions: SelectOption[] = [
  { label: "Standard", value: "standard" },
  { label: "Short", value: "short" },
  { label: "Editorial", value: "editorial" },
];

export const sectionCtaPresetOptions: SelectOption[] = [
  { label: "Solid button", value: "solid" },
  { label: "Outline button", value: "outline" },
  { label: "Text link", value: "text" },
];

/**
 * Card preset dropdown shown only for card-style blocks (collection grid,
 * feature grid). The preset names are intent-oriented so marketing picks a
 * card style instead of composing layout knobs that can break on mobile.
 */
export const cardPresetOptions: SelectOption[] = [
  { label: "Standard card", value: "standard" },
  { label: "Image overlay", value: "imageOverlay" },
  { label: "Brand logo card", value: "brandLogo" },
];

export const pageSlugOptions: SelectOption[] = [
  { label: "Home", value: "home" },
  { label: "Products", value: "products" },
  { label: "Tires", value: "tires" },
  { label: "Rims", value: "rims" },
  { label: "Accessories", value: "accessories" },
  { label: "Careers", value: "careers" },
  { label: "About", value: "about" },
  { label: "Events and Awards", value: "events-awards" },
  { label: "News", value: "news" },
  { label: "Events", value: "events" },
  { label: "Awards", value: "awards" },
  { label: "Promotions", value: "promotions" },
  { label: "Search", value: "search" },
];

export const pageBlockTypeOptions: SelectOption[] = [
  { label: "Hero Banner", value: "hero" },
  { label: "Careers Intro Band", value: "careersIntro" },
  { label: "Moving Brand Images", value: "brandMarquee" },
  { label: "Category Buttons", value: "categoryTiles" },
  { label: "Card Grid", value: "collectionGrid" },
  { label: "Feature Cards", value: "featureGrid" },
  { label: "Photo Strip", value: "imageMarquee" },
  { label: "Feature Story", value: "showcase" },
  { label: "Job Listings", value: "jobsList" },
  { label: "Contact Form", value: "contact" },
  { label: "Product Type Rows", value: "categorySections" },
  { label: "Featured Story Rows", value: "projectList" },
  { label: "Event Calendar", value: "calendar" },
  { label: "Search Filters", value: "searchFilters" },
  { label: "Text Section", value: "richText" },
];

function pageLabel(slug: ContentPageSlug) {
  return pageSlugOptions.find((option) => option.value === slug)?.label ?? slug;
}

function blockLabel(type: PageBlockType) {
  return pageBlockTypeOptions.find((option) => option.value === type)?.label ?? type;
}

function cloneAppearance(appearance: BlockAppearance): BlockAppearance {
  return {
    ...appearance,
    decoration: appearance.decoration ? { ...appearance.decoration } : undefined,
  };
}

const appearancePresetMap: Record<
  Exclude<SectionAppearancePreset, "custom">,
  BlockAppearance
> = {
  "deep-brand-curve": {
    background: "deep-brand-red",
    headingScale: "display",
    headingStyle: "standard",
    textTone: "default",
    textColorScheme: "light",
    decoration: {
      style: "curve",
      position: "bottom",
      size: "lg",
      color: "surface-1",
    },
  },
  "deep-brand-wave": {
    background: "deep-brand-red",
    headingScale: "display",
    headingStyle: "standard",
    textTone: "default",
    textColorScheme: "light",
    decoration: {
      style: "wave",
      position: "bottom",
      size: "lg",
      color: "surface-1",
    },
  },
  "light-curve-top": {
    background: "surface-1",
    headingScale: "display",
    headingStyle: "standard",
    textTone: "default",
    textColorScheme: "default",
    decoration: {
      style: "curve",
      position: "top",
      size: "lg",
      color: "deep-brand-red",
    },
  },
  "warm-wave-top": {
    background: "surface-3",
    headingScale: "standard",
    headingStyle: "standard",
    textTone: "default",
    textColorScheme: "default",
    decoration: {
      style: "wave",
      position: "top",
      size: "lg",
      color: "deep-brand-red",
    },
  },
  "ink-spotlight": {
    background: "ink",
    headingScale: "display",
    headingStyle: "emphasis",
    textTone: "default",
    textColorScheme: "light",
    decoration: {
      style: "blob",
      position: "bottom",
      size: "lg",
      color: "deep-brand-red",
    },
  },
};

function createAppearancePreset(preset: SectionAppearancePreset): BlockAppearance {
  if (preset === "custom") {
    return {};
  }

  return cloneAppearance(appearancePresetMap[preset]);
}

function applyAppearancePreset(appearance?: BlockAppearance): BlockAppearance {
  const nextAppearance = cloneAppearance(appearance ?? {});
  const preset = nextAppearance.preset;

  if (!preset || preset === "custom") {
    return nextAppearance;
  }

  const presetAppearance = createAppearancePreset(preset);

  return {
    ...nextAppearance,
    ...presetAppearance,
    decoration: {
      ...(nextAppearance.decoration ?? {}),
      ...(presetAppearance.decoration ?? {}),
    },
  };
}

function createCareersIntroAppearance(): BlockAppearance {
  return {
    preset: "deep-brand-curve",
    ...createAppearancePreset("deep-brand-curve"),
  };
}

export function collectionVariantForSource(source: CollectionGridSource) {
  return source === "catalogCategories" ? "categories" : source;
}

export function createPageDocumentTemplate(slug: ContentPageSlug): PageDocument {
  if (slug === "search") {
    return {
      id: "page-search",
      slug,
      title: pageLabel(slug),
      summary: "Find pages, products, jobs, events, awards, and story content from Team Ridemax.",
      blocks: [
        {
          id: "search-hero",
          type: "hero",
          order: 1,
          title: "Search",
          summary: "Find pages, products, jobs, events, awards, and story content from Team Ridemax.",
          image: { src: "", alt: "Ridemax search hero" },
          align: "center",
          dark: true,
          minHeight: "min-h-[18rem]",
          tone: "default",
          appearance: {
            background: "surface-1",
            headingScale: "display",
            headingStyle: "standard",
            textTone: "default",
            textColorScheme: "default",
            decoration: { style: "none", position: "bottom", size: "md", color: "brand-red" },
          },
        },
        {
          id: "search-filters",
          type: "searchFilters",
          order: 2,
          title: "Filter by",
          summary: "Let customers refine search results by category and choose the result order.",
          categoryOptions: ["Tire", "PCR", "TBR"],
          sortOptions: ["best", "newest", "name-asc", "name-desc"],
          quickMatchesLabel: "Quick Matches",
          maxSuggestions: 6,
          appearance: {
            background: "surface-1",
            headingScale: "standard",
            headingStyle: "standard",
            textTone: "default",
            textColorScheme: "default",
            decoration: { style: "none", position: "bottom", size: "md", color: "brand-red" },
          },
        },
      ],
    };
  }

  return {
    id: `page-${slug}`,
    slug,
    title: pageLabel(slug),
    summary: "",
    blocks: [],
  };
}

export function createPageBlockTemplate(type: PageBlockType): PageBlock {
  const defaultAppearance: BlockAppearance = {
    preset: "custom",
    background: "surface-1",
    headingScale: "standard",
    headingStyle: "standard",
    textTone: "default",
    textColorScheme: "default",
    decoration: {
      style: "none",
      position: "bottom",
      size: "md",
      color: "brand-red",
    },
  };
  const base = {
    id: `${type}-${Date.now()}`,
    type,
    order: 1,
    title: "",
    summary: "",
    eyebrow: "",
    appearance: defaultAppearance,
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
    case "careersIntro":
      return {
        ...base,
        type,
        images: [],
        direction: "right-to-left",
        altPrefix: "Ridemax careers gallery",
        appearance: createCareersIntroAppearance(),
      };
    case "brandMarquee":
      return {
        ...base,
        type,
        direction: "right-to-left",
        categorySlug: "",
        brandSlugs: [],
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
        appearance: { ...defaultAppearance, cardPreset: "standard" },
        type,
        source: "news",
        variant: "news",
        limit: 3,
        featuredOnly: false,
      };
    case "featureGrid":
      return {
        ...base,
        appearance: { ...defaultAppearance, cardPreset: "standard" },
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
    case "searchFilters":
      return {
        ...base,
        type,
        title: "Filter by",
        summary: "Let customers refine search results by category and sort order.",
        categoryOptions: ["Tire", "PCR", "TBR"],
        sortOptions: ["best", "newest", "name-asc", "name-desc"],
        quickMatchesLabel: "Quick Matches",
        maxSuggestions: 6,
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

type AppearanceEditorTarget = PageBlock | PageBlockType | undefined;

const lightSectionBackgrounds = new Set<NonNullable<BlockAppearance["background"]>>([
  "surface-1",
  "surface-2",
  "surface-3",
]);

function allowedTextColorSchemesForBackground(
  background: NonNullable<BlockAppearance["background"]>,
) {
  return lightSectionBackgrounds.has(background)
    ? ["default", "dark", "muted", "brand"]
    : ["light"];
}

function defaultTextColorSchemeForBackground(
  background: NonNullable<BlockAppearance["background"]>,
) {
  return lightSectionBackgrounds.has(background) ? "default" : "light";
}

function fallbackDecorationColorForBackground(
  background: NonNullable<BlockAppearance["background"]>,
) {
  return lightSectionBackgrounds.has(background) ? "brand-red" : "surface-1";
}

function appearanceTargetType(target: AppearanceEditorTarget) {
  return typeof target === "string" ? target : target?.type;
}

function appearanceTargetAppearance(target: AppearanceEditorTarget) {
  return typeof target === "string" ? undefined : target?.appearance;
}

function disableOptions(options: SelectOption[], disabledValues: string[]) {
  const disabled = new Set(disabledValues);
  return options.map((option) => ({
    ...option,
    disabled: disabled.has(option.value),
  }));
}

function isCompactHero(target: AppearanceEditorTarget) {
  if (typeof target === "string" || target?.type !== "hero") {
    return false;
  }

  return ["min-h-[16rem]", "min-h-[18rem]", "min-h-[20rem]"].includes(
    target.minHeight ?? "",
  );
}

/**
 * Normalizes unsafe appearance combinations at the page-builder seam.
 * The renderer can stay simple because invalid text/shape choices are folded
 * back into safe presets as editors make changes.
 */
export function sanitizePageBlockAppearance(block: PageBlock): PageBlock {
  const appearance = applyAppearancePreset(block.appearance);
  const background = appearance.background ?? "surface-1";
  const decoration = { ...(appearance.decoration ?? {}) };
  const allowedTextSchemes = allowedTextColorSchemesForBackground(background);

  if (
    !appearance.textColorScheme ||
    !allowedTextSchemes.includes(appearance.textColorScheme)
  ) {
    appearance.textColorScheme = defaultTextColorSchemeForBackground(background);
  }

  if (decoration.color === background) {
    decoration.color = fallbackDecorationColorForBackground(background);
  }

  if (block.type === "hero" && isCompactHero(block) && decoration.size === "lg") {
    decoration.size = "md";
  }

  return {
    ...block,
    ...(block.type === "hero" && !block.image.src.trim() ? { dark: false } : {}),
    appearance: {
      ...appearance,
      decoration,
    },
  } as PageBlock;
}

/**
 * Appearance fields shown in the block editor. When `blockType` is a
 * card-style block (collection grid or feature grid), we also expose the
 * card preset dropdown. For hero/marquee/etc. the preset is meaningless,
 * so hiding it avoids a shallow knob per AGENTS.md §7.
 */
export function getPageBlockAppearanceFields(
  target?: AppearanceEditorTarget,
): PageBlockFieldConfig[] {
  const blockType = appearanceTargetType(target);
  const appearance = appearanceTargetAppearance(target);
  const background = appearance?.background ?? "surface-1";
  const disabledTextSchemes = sectionTextColorSchemeOptions
    .map((option) => option.value)
    .filter((value) => !allowedTextColorSchemesForBackground(background).includes(value));
  const disabledShapeColors = appearance?.decoration?.style === "none" ? [] : [background];
  const disabledShapeSizes = isCompactHero(target) ? ["lg"] : [];
  const base: PageBlockFieldConfig[] = [
    {
      key: "appearance.preset",
      label: "Section Preset",
      type: "select",
      options: sectionAppearancePresetOptions,
      helpText:
        "Choose a preconfigured combination. Changing a section appearance control switches the block back to Custom.",
    },
    {
      key: "appearance.background",
      label: "Section Background",
      type: "select",
      options: sectionBackgroundOptions,
      helpText: "Choose the surface behind this section.",
    },
    {
      key: "appearance.textColorScheme",
      label: "Text Color Scheme",
      type: "select",
      options: disableOptions(sectionTextColorSchemeOptions, disabledTextSchemes),
      helpText: "Only readable color choices are available for the selected background.",
    },
    {
      key: "appearance.headingScale",
      label: "Heading Size",
      type: "select",
      options: sectionHeadingScaleOptions,
    },
    {
      key: "appearance.headingStyle",
      label: "Heading Style",
      type: "select",
      options: sectionHeadingStyleOptions,
    },
    {
      key: "appearance.decoration.style",
      label: "Shape Style",
      type: "select",
      options: sectionDecorationStyleOptions,
    },
    {
      key: "appearance.decoration.color",
      label: "Shape Color",
      type: "select",
      options: disableOptions(sectionDecorationColorOptions, disabledShapeColors),
    },
    {
      key: "appearance.decoration.position",
      label: "Shape Position",
      type: "select",
      options: sectionDecorationPositionOptions,
    },
    {
      key: "appearance.decoration.size",
      label: "Shape Size",
      type: "select",
      options: disableOptions(sectionDecorationSizeOptions, disabledShapeSizes),
    },
  ];

  if (blockType === "collectionGrid" || blockType === "featureGrid") {
    base.push({
      key: "appearance.cardPreset",
      label: "Card Style",
      type: "select",
      options: cardPresetOptions,
      helpText: "Choose the card look for this section.",
    });
  }

  if (blockType === "collectionGrid") {
    base.push(
      {
        key: "appearance.layoutPreset",
        label: "Layout",
        type: "select",
        options: sectionLayoutPresetOptions,
        helpText: "Choose how roomy the card grid should feel.",
      },
      {
        key: "appearance.bodyTextPreset",
        label: "Body Text",
        type: "select",
        options: sectionBodyTextPresetOptions,
      },
      {
        key: "appearance.ctaPreset",
        label: "Button Style",
        type: "select",
        options: sectionCtaPresetOptions,
      },
    );
  }

  return base;
}

export function getPageBlockFields(block: PageBlock): PageBlockFieldConfig[] {
  const common: PageBlockFieldConfig[] = [
    { key: "title", label: "Title", type: "text" },
    { key: "summary", label: "Summary", type: "textarea" },
    {
      key: "eyebrow",
      label: "Eyebrow",
      type: "text",
      helpText: "Small text above the main title, used for context or category.",
    },
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
        {
          key: "dark",
          label: "Dark Overlay",
          type: "checkbox",
          helpText: "Adds a dark layer over the image to improve text readability.",
        },
        { key: "minHeight", label: "Hero Height", type: "select", options: heroMinHeightOptions },
        {
          key: "tone",
          label: "Tone",
          type: "select",
          options: [
            { label: "Default", value: "default" },
            { label: "Accent", value: "accent" },
          ],
        },
        { key: "cta.label", label: "CTA Label", type: "text", helpText: "Button text shown over the hero image. Leave blank to hide the button." },
        { key: "cta.href", label: "CTA Link", type: "text", helpText: "URL the button navigates to, e.g. /products or https://example.com." },
      ];
    case "careersIntro":
      return [
        ...common,
        {
          key: "images",
          label: "Moving Images",
          type: "image-list",
          helpText:
            "Upload or select the photos that move across this red intro band. Their order here is the order used on the public page.",
        },
        {
          key: "direction",
          label: "Direction",
          type: "select",
          options: motionDirectionOptions,
        },
        {
          key: "altPrefix",
          label: "Alt Prefix",
          type: "text",
          helpText: "Shared alt text prefix for the moving image strip.",
        },
      ];
    case "brandMarquee":
      return [
        ...common,
        {
          key: "categorySlug",
          label: "Brand Category",
          type: "select",
          helpText:
            "Use all published brands from one category, or leave it on All brands and choose an explicit list below.",
          options: [
            { label: "All brands", value: "" },
            { label: "Tires", value: "tires" },
            { label: "Rims", value: "rims" },
            { label: "Accessories", value: "accessories" },
          ],
        },
        {
          key: "brandSlugs",
          label: "Moving Brands",
          type: "brand-list",
          helpText:
            "Choose the brands and order used in this strip. Edit each card image, summary, category, and tags in the Brands sections below.",
        },
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
          label: "Content Source",
          type: "select",
          helpText:
            "Card images are edited in the selected collection below, not inside this page block.",
          options: [
            { label: "Brands", value: "brands" },
            { label: "News", value: "news" },
            { label: "Events", value: "events" },
            { label: "Awards", value: "awards" },
            { label: "Promotions", value: "promotions" },
            { label: "Catalog Categories", value: "catalogCategories" },
          ],
        },
        { key: "limit", label: "Limit", type: "text" },
        { key: "featuredOnly", label: "Featured Only", type: "checkbox" },
        { key: "categorySlug", label: "Category Filter", type: "text" },
        {
          key: "cta.label",
          label: "CTA Label",
          type: "text",
          helpText: "Button text shown in this section.",
        },
        {
          key: "cta.href",
          label: "CTA Link",
          type: "text",
          helpText: "Where the button should open.",
        },
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
          key: "images",
          label: "Moving Images",
          type: "image-list",
          helpText:
            "Upload or select the images that move across this section. Their order here is the order used on the public page.",
        },
        {
          key: "direction",
          label: "Direction",
          type: "select",
          options: motionDirectionOptions,
        },
        { key: "altPrefix", label: "Alt Prefix", type: "text" },
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
        {
          key: "aboutCta.label",
          label: "About CTA Label",
          type: "text",
          helpText: "Button text shown below the jobs list.",
        },
        {
          key: "aboutCta.href",
          label: "About CTA Link",
          type: "text",
          helpText: "Where the button should open.",
        },
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
        {
          key: "categorySlug",
          label: "Product Category",
          type: "select",
          options: [
            { label: "Tires", value: "tires" },
            { label: "Rims", value: "rims" },
            { label: "Accessories", value: "accessories" },
          ],
        },
      ];
    case "projectList":
    case "calendar":
      return common;
    case "searchFilters":
      return [
        ...common,
        {
          key: "categoryOptions",
          label: "Filter Options",
          type: "textarea",
          helpText: "One filter label per line, for example Tire, PCR, TBR.",
        },
        {
          key: "sortOptions",
          label: "Sort Options",
          type: "textarea",
          helpText: "Use supported sort keys: best, newest, name-asc, name-desc.",
        },
        { key: "quickMatchesLabel", label: "Suggestions Label", type: "text" },
        { key: "maxSuggestions", label: "Max Suggestions", type: "text" },
      ];
    case "richText":
      return common;
  }
}
