# PR Title

Make hero text image-safe and align home moving images with the Page Builder

# PR Description

## Summary

This PR improves Page Builder safety and admin clarity across the current marketing pages. It adds image-aware hero legibility rules, introduces lightweight analytics/activity visibility in the admin, and fixes the home moving strip so the public images are stored in the editable moving-image gallery rather than being silently pulled from the brand collection.

## Implementation Approach

I went with the safest CMS-friendly pattern here: preset plus restriction logic plus an automatic image scrim, not raw image analysis. That fits the existing builder cleanly and avoids handing marketing technical controls that are easy to misuse.

The hero work is implemented across:

- `lib/page-builder.ts`
- `lib/ridemax-types.ts`
- `lib/content-schemas.ts`
- `components/hero-banner.tsx`

Image heroes now default into a safe path:

- New preset: `Image Hero Safe`
- Image heroes only allow readable text schemes.
- The hero renderer adds a stronger image overlay plus a focused text scrim.
- The admin label is now `Image Overlay` instead of `Dark Overlay`.
- Careers-only presets are hidden from unrelated hero blocks in the Page Builder.

That means the `Excellence in Every Ride` hero stays readable even on darker or busy photos, and new image heroes land on a safe preset instead of a fragile custom combination.

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

## Analytics

This PR adds basic first-party analytics and surfaces it in admin.

Implementation points:

- Public tracker: `components/public-analytics-tracker.tsx`
- Ingest route: `app/api/analytics/events/route.ts`
- Server summary logic: `lib/server/site-analytics.ts`
- Admin UI: `components/admin-dashboard.tsx`, `components/admin-screen.tsx`, `components/admin-sidebar.tsx`

The dashboard now shows:

- Page views
- Tracked click events
- Search submits
- Top pages
- Top click targets
- Recent audience events
- Recent admin activity / who changed what

Tracked now, with low performance cost:

- Page views
- Hero CTA clicks
- Brand card clicks
- Product card clicks
- Job detail clicks
- Search submits

This stays lightweight because it uses small first-party beacons instead of a heavy third-party analytics script. The PR also adds local fallbacks in `data/site-analytics-events.json` and `data/admin-activity-log.json`, while production can use the new table in `supabase/schema.sql`.

## Admin Access And Publishing Notes

For the three-admin and master-admin workflow, the current shared-password screen is acceptable as a temporary lock, but it is not the proven long-term pattern. The recommended next step is individual accounts with roles:

- `Editor`: save drafts and preview.
- `Publisher`: publish and restore revisions.
- `Master Admin / IT`: manage admins, revoke sessions, and reset access.

For logging out a currently logged-in admin from a master account, the proven pattern is session revocation, not sharing one password. In practice, that means moving to Supabase Auth or another auth provider, storing real user identities, and giving IT a session-management screen with revoke session / sign out all devices.

For draft, preview, publish, and revision UI, the current direction is good:

- Sticky `Save Draft`, `Preview`, and `Publish` controls.
- Revisions drawer for rollback.
- Preview badge / exit preview.
- Recent admin activity on the dashboard.

Recommended next upgrade: require a short publish note so the revision log explains why something changed.

## Validation

- `npm run lint`
- `npm run build`

## Notes For Review

- The branch intentionally does not merge itself. Please review the Page Builder Home block after deploy: the moving strip should appear as `Moving Brand Images` with a visible image gallery containing 14 images.
- Supabase content that still has `home-brand-marquee` as a `brandMarquee` block will be normalized at read time into the same image-gallery shape.
