# PR Draft: Brand Page Follow-up

Branch: `codex/brand-page-pr-handoff`

## Title

Polish brand-selected product pages and jobs divider spacing

## Summary

This PR tightens two public-site seams that were still awkward after the recent builder work:

- make brand-selected category pages behave like a focused brand listing instead of a generic products page
- keep the careers jobs eyebrow readable when the section uses the new cross-wave top divider

## Why

The brand-selected route already narrows the results to one brand, but it still carried leftover generic UI:

- the hero CTA still said `Back to Products`
- the brand page still showed a left filter rail even though the page was already narrowed to one brand
- the sort menu still exposed `Newest` even though that choice does not add value here

On Careers, the new cross-wave divider was structurally correct, but the jobs section started too close to the top-mounted ribbon and made the `Now Hiring` eyebrow feel crowded.

## What Changed

- make the hero CTA on `/products/[slug]?brand=...` read `Back to {Brand}`
- point that CTA back to the matching brand card on the category landing grid via `#brand-{slug}`
- remove the brand-page filter sidebar from the brand-selected listing experience
- keep the brand-selected view focused on results plus sort controls
- remove `Newest` from the brand-page sort choices
- add anchor ids to category brand cards so the new back link has a meaningful destination
- add a top-decoration inset helper for the jobs section so `Light Cross Wave Top` does not obscure the eyebrow/header content

## Testing

Verified locally:

- `npm run lint`
- `npm run build`

## Manual Checks

- open `/products/tires?brand=apollo-tyres`
- confirm the hero CTA reads `Back to Apollo Tyres`
- click it and confirm the base Tires page lands on the Apollo card
- confirm the brand-selected page no longer shows the left `Filter by` panel
- confirm the sort menu only shows `Best Match`, `Name A-Z`, and `Name Z-A`
- open Careers and confirm `Now Hiring` stays readable with the top cross-wave divider
