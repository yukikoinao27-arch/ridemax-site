# CMS Recreation Walkthrough

Use this as the E2E script for rebuilding the public site from the admin panel. The goal is not to make marketing design from raw JSON; the goal is to prove the CMS gives them enough safe controls to recreate the current site without developer help.

## 0. Before Testing

1. Run the Supabase draft/publish migration in `supabase/schema.sql`.
2. Open `/admin`.
3. Use the left CMS navigation only. The public customer navbar should not appear in admin.
4. Treat `Save Draft`, `Preview`, and `Publish` as separate states:
   - `Save Draft` stores work privately.
   - `Preview` opens the public page with draft content.
   - `Publish` makes the saved draft live.
   - `Exit Preview` appears only when preview mode is active.

## 1. Recreate Global Site Settings

Go to `Settings`.

1. Set site name, light logo, dark logo, footer description, contact address, phone, email, and map fields.
2. Build the navigation rows: Home, Products, Careers, Events and Awards, About Us.
3. Add dropdown children only through the `Children (Label | /path per line)` field.
4. Add social links and shop links using the provided platform/shop controls.
5. Save Draft, then Preview.

## 2. Recreate Product And Brand Storytelling

Go to `Pages`.

1. Use `Catalog Categories` to define Tires, Rims, and Accessories.
2. Use each category's `Sections` list for the storytelling rows under that category.
3. Use `Brands` for all brand cards. Brand images live here, not inside collection-grid page blocks.
4. For brand category, use the same slugs as the catalog categories: `tires`, `rims`, or `accessories`.
5. Save Draft, Preview `/products`, `/products/tires`, `/products/rims`, and `/products/accessories`.

## 3. Recreate Home Page Blocks

Still in `Pages`, choose `Home` in the Page Builder.

Use this block order as the baseline:

1. Hero Banner
2. Logo Strip
3. Category Tiles
4. Collection Grid for featured brands
5. Collection Grid for news
6. Collection Grid for promotions
7. Collection Grid for events
8. Contact

For each block:

1. Use only the allowed block type dropdown.
2. Use `Section Appearance` for alternating backgrounds.
3. Use decorative shape controls only where the page needs a ribbon/wave/curve.
4. Use card presets for card sections; do not hand-tune card layouts.
5. Save Draft after each major group, then Preview.

## 4. Recreate Stories

Go to `Stories`.

1. Add News with title, excerpt, summary, image, featured, and published status.
2. Add Events with start/end date, venue, location, card image, detail image, and share links.
3. Add Awards independently from events.
4. Add Project Features for combined event/award landing rows.
5. Save Draft, Preview `/news`, `/events`, `/awards`, and `/events-awards`.

## 5. Recreate Promotions

Go to `Promotions`.

1. Add one promotion per campaign.
2. Use only supported YouTube/Vimeo URLs.
3. Upload a thumbnail for fallback and sharing.
4. Keep campaign tags short.
5. Save Draft, Preview `/promotions`, then Publish when video cards render.

Promotion embeds autoplay muted because browsers generally block audible autoplay.

## 6. Recreate Careers

Go to `Careers`.

The proven low-IT pattern for this business is:

1. Marketing owns `Departments`.
2. Marketing owns `Jobs`.
3. Each job has department, title, location, type, summary, description, featured, and published status.
4. Applications should eventually go into a separate `Applications Inbox` with statuses: New, Reviewed, Contacted, Archived. Do not mix job applications with general contact messages.

Current CMS scope lets marketing publish and hide roles without IT. A future application inbox should mirror the contact inbox but be career-specific.

## 7. Publish Checklist

Before pressing Publish:

1. No broken images on Home, product category pages, Stories, Promotions, Careers, About, and Search.
2. Mobile width checked first.
3. Desktop width checked second.
4. Collection Grid note followed: collection images are edited in Brands, News, Events, Promotions, or Categories.
5. Save Draft is clean and the sticky bar no longer says `Unsaved changes`.
6. Press Publish.
7. Reload the public browser page in a normal tab.

## Wix Content Transfer

There is no reliable way to pull a Wix draft as structured CMS data unless you have a Wix export/API path for the content. The practical method is:

1. Use the Wix draft as a visual reference.
2. Screenshot each page at mobile and desktop widths.
3. Copy text manually into the matching CMS collections.
4. Download or replace images with the approved media assets.
5. Rebuild page structure using the Page Builder block list.
6. Preview and compare side by side.
