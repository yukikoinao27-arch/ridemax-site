# PR Title

Make hero text image-safe and align home moving images with the Page Builder

# PR Description

## Summary

This PR improves Page Builder safety and admin clarity across the current marketing pages. It adds image-aware hero legibility rules, introduces lightweight analytics/activity visibility in the admin, and fixes the home moving strip so the public images are stored in the editable moving-image gallery rather than being silently pulled from the brand collection.

## Changes

- Add an `Image Hero Safe` section preset for image-based hero/banner blocks.
- Force image heroes to use readable light text and auto-enable the dark image overlay when needed.
- Improve the hero overlay copy so admins understand it darkens photos for readability.
- Hide careers-only section presets from unrelated blocks/pages.
- Add basic public analytics capture for page views, clicks, searches, product clicks, brand clicks, job clicks, and CTA clicks.
- Add an admin dashboard analytics panel and recent admin activity panel.
- Add local JSON fallbacks for analytics and admin activity logs when Supabase is unavailable.
- Convert the Home moving brand strip into an editable moving-image gallery with 14 explicit images.
- Normalize legacy Home `brandMarquee` content into an image gallery on load so old Supabase content does not render invisible "ghost" brand images.
- Remove the old `Home Brand Strip` admin sidebar anchor.
- Add short helper descriptions for Promotions `CTA Label` and `CTA Link`.
- Change the brand-filtered Tires page hero button from `Back to Apollo Tyres` to `Back to Tire Brands`.

## Validation

- `npm run lint`
- `npm run build`

## Notes For Review

- The branch intentionally does not merge itself. Please review the Page Builder Home block after deploy: the moving strip should appear as `Moving Brand Images` with a visible image gallery containing 14 images.
- Supabase content that still has `home-brand-marquee` as a `brandMarquee` block will be normalized at read time into the same image-gallery shape.
