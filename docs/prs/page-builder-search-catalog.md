# PR Draft: Page Builder Search + Catalog Wiring

Branch: `codex/page-builder-search-catalog`

## Summary

This branch continues the admin/page-builder cleanup with a focused architecture pass:

- make Search a first-class page-builder page
- keep same-page navbar clicks scrolling to top on the public site
- clean up legacy About/Product helper copy that should not leak to customers
- add the missing Home brand/logo carousel normalization
- wire product catalog draft/publish support so category-brand pages are actually manageable from admin
- expose scoped catalog editing inside the existing admin idiom instead of creating a second CMS

## Why

The current app can already describe brand/category pages in the CMS, but the actual tire/rim/accessory product rows still live outside the admin draft/publish flow. That leaves a shallow seam:

- marketing can edit the shell
- brand "See More" routes can resolve
- but some brand pages still show no products because the catalog data is not editable in the same workflow

This PR closes that gap without broad redesign.

## What Changed

### Already in branch

- Search page reads builder-configured hero/filter settings
- same-page header nav scrolls to top
- search autocomplete layering stays above results
- legacy product helper copy is stripped from public rendering
- About placeholder story-copy blocks are normalized away
- product detail breadcrumb/sku/prev-next cleanup is in place

### Landed in this pass

- add a PR draft file for review handoff
- add product catalog draft/save/publish plumbing
- add admin API route for catalog draft writes
- make Publish push both site content and catalog
- load draft catalog in admin
- expose category/brand/product editing panels for Tires/Rims/Accessories in the existing page-builder flow
- preview unsaved catalog snapshots with the existing admin Preview action
- link product detail breadcrumbs back to brand-filtered category listings
- keep same-page nav scrolling from intercepting links that intentionally clear query filters

## Schema / Migration Notes

This pass introduces or expects:

- `product_catalog_documents`
- optionally `product_catalog_revisions` in a later follow-up if catalog rollback needs the same drawer UX as site content

If Supabase is not migrated yet, local JSON fallback should keep dev usable.

## Testing

Verified locally:

- `npm run lint`
- `npm run build`

Manual checks still recommended before merge:

- save draft from Pages admin
- publish from admin
- verify `/products/tires?brand=...` shows matching products
- verify Search still renders configured filter/sort controls

## Follow-ups

- dynamic "create any new product category page" model
- full Search builder beyond hero + faceted settings
- unified revision history for both content bundle and product catalog
- external catalog adapter wiring for a real upstream API
