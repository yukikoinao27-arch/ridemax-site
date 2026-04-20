import {
  getDraftSiteContent,
  listContactMessages,
} from "@/lib/server/ridemax-content-repository";
import { pageSlugOptions } from "@/lib/page-builder";

/**
 * One searchable entry inside the admin command palette.
 *
 * `href` is the admin destination the user lands on when they pick the entry.
 * `kind` groups similar results in the UI so marketing can scan a long list.
 * `keywords` are additional tokens that should match a query but are not
 * shown (e.g. a brand's category slug or tag list).
 */
export type AdminSearchEntry = {
  id: string;
  label: string;
  description: string;
  href: string;
  kind:
    | "page"
    | "brand"
    | "news"
    | "event"
    | "award"
    | "promotion"
    | "job"
    | "department"
    | "inbox"
    | "action";
  keywords: string[];
};

/**
 * Stable navigation actions that are always available. Keeping these
 * hard-coded (instead of deriving them from the sidebar config) means a
 * future sidebar refactor cannot silently drop entries from the palette.
 */
const STATIC_ACTIONS: AdminSearchEntry[] = [
  {
    id: "action-dashboard",
    label: "Go to Dashboard",
    description: "Admin overview and inbox",
    href: "/admin",
    kind: "action",
    keywords: ["home", "overview", "metrics"],
  },
  {
    id: "action-pages",
    label: "Go to Pages",
    description: "Page builder and catalog pages",
    href: "/admin/pages",
    kind: "action",
    keywords: ["builder", "blocks", "home page"],
  },
  {
    id: "action-stories",
    label: "Go to Stories",
    description: "News, events, awards",
    href: "/admin/events",
    kind: "action",
    keywords: ["news", "events", "awards", "content"],
  },
  {
    id: "action-promotions",
    label: "Go to Promotions",
    description: "Video campaigns",
    href: "/admin/promotions",
    kind: "action",
    keywords: ["video", "campaign"],
  },
  {
    id: "action-careers",
    label: "Go to Careers",
    description: "Departments and jobs",
    href: "/admin/careers",
    kind: "action",
    keywords: ["hr", "recruiting", "hiring"],
  },
  {
    id: "action-settings",
    label: "Go to Settings",
    description: "Branding and contact data",
    href: "/admin/settings",
    kind: "action",
    keywords: ["config", "site", "contact"],
  },
  {
    id: "action-inbox",
    label: "Open Inbox",
    description: "Contact form messages",
    href: "/admin#inbox",
    kind: "action",
    keywords: ["messages", "leads", "contacts"],
  },
];

function pageLabel(slug: string) {
  return pageSlugOptions.find((option) => option.value === slug)?.label ?? slug;
}

/**
 * Build a flat, client-safe search index for the admin command palette.
 *
 * The palette is a deep module: callers supply a query,
 * the index owns everything about what is searchable and where each entry
 * points to. Results are sorted by kind grouping, then alphabetically, so
 * the palette itself does not need to care about ordering.
 */
export async function getAdminSearchIndex(): Promise<AdminSearchEntry[]> {
  const content = await getDraftSiteContent();
  const messageCount = (await listContactMessages()).length;

  const pages: AdminSearchEntry[] = content.pages.map((page) => ({
    id: `page-${page.slug}`,
    label: pageLabel(page.slug),
    description: `${page.blocks.length} block(s)`,
    href: "/admin/pages",
    kind: "page",
    keywords: [page.slug, page.summary ?? ""],
  }));

  const brands: AdminSearchEntry[] = content.brands.map((brand) => ({
    id: `brand-${brand.id}`,
    label: brand.label,
    description: brand.summary,
    href: "/admin/pages#pages-brands",
    kind: "brand",
    keywords: [brand.slug, brand.categorySlug, ...brand.tags],
  }));

  const news: AdminSearchEntry[] = content.newsItems.map((item) => ({
    id: `news-${item.id}`,
    label: item.title,
    description: item.excerpt,
    href: "/admin/events#content-news",
    kind: "news",
    keywords: [item.slug],
  }));

  const events: AdminSearchEntry[] = content.events.map((item) => ({
    id: `event-${item.id}`,
    label: item.title,
    description: `${item.teaserDate} - ${item.location}`,
    href: "/admin/events#content-events",
    kind: "event",
    keywords: [item.slug, item.venue],
  }));

  const awards: AdminSearchEntry[] = content.awards.map((item) => ({
    id: `award-${item.id}`,
    label: item.title,
    description: `${item.year} - ${item.summary}`,
    href: "/admin/events#content-awards",
    kind: "award",
    keywords: [item.slug],
  }));

  const promotions: AdminSearchEntry[] = content.promotions.map((item) => ({
    id: `promo-${item.id}`,
    label: item.title,
    description: item.summary,
    href: "/admin/promotions#content-promotions",
    kind: "promotion",
    keywords: [item.slug, ...item.tags],
  }));

  const jobs: AdminSearchEntry[] = content.jobs.map((item) => ({
    id: `job-${item.id}`,
    label: item.title,
    description: `${item.location} - ${item.type}`,
    href: "/admin/careers#careers-jobs",
    kind: "job",
    keywords: [item.slug, item.departmentSlug],
  }));

  const departments: AdminSearchEntry[] = content.departments.map((item) => ({
    id: `dept-${item.id}`,
    label: item.name,
    description: "Department",
    href: "/admin/careers#careers-departments",
    kind: "department",
    keywords: [item.slug],
  }));

  const inboxAction: AdminSearchEntry[] =
    messageCount > 0
      ? [
          {
            id: "inbox-unread",
            label: `${messageCount} message${messageCount === 1 ? "" : "s"} in inbox`,
            description: "Contact form submissions",
            href: "/admin#inbox",
            kind: "inbox",
            keywords: ["messages", "leads"],
          },
        ]
      : [];

  return [
    ...STATIC_ACTIONS,
    ...pages,
    ...brands,
    ...news,
    ...events,
    ...awards,
    ...promotions,
    ...jobs,
    ...departments,
    ...inboxAction,
  ];
}
