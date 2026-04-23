# PR Draft: Cross Wave Builder Polish

Branch: `codex/cross-wave-builder-polish`

## Title

Add cross-wave page-builder dividers and polish admin action feedback

## Summary

This PR tightens the page-builder editing experience and adds the missing divider shape needed to better reproduce the Wix careers layout.

- add a reusable `Cross Wave` section divider style
- expose matching `Light Cross Wave Top` and `Light Cross Wave Bottom` appearance presets
- switch the careers jobs section to the new cross-wave divider
- make page-builder up/down/delete icon buttons show the expected hand cursor
- replace gallery "updated" toasts with visual dirty-state feedback on the `Done` button

## Why

The current builder can already reproduce the large red careers intro via `Deep Brand Curve`, but it still falls short on the ribbon-like divider between the showcase and jobs sections. At the same time, small admin controls still feel unfinished when hover states do not advertise clickability and gallery edits rely on redundant close-toasts instead of local visual feedback.

This pass fixes both seams without introducing one-off careers-only code.

## What Changed

- add `cross-wave` to the shared section decoration style model
- add matching schema support for the new divider style
- render `Cross Wave` with a dedicated SVG shape instead of trying to force it through the old single-curve CSS
- add two reusable appearance presets:
  - `Light Cross Wave Top`
  - `Light Cross Wave Bottom`
- update the careers jobs section seed content to use the new top cross-wave divider
- add `cursor-pointer` to page-builder icon action buttons
- keep upload success notices, but replace `Done`-time gallery notices with a highlighted dirty-state button in the media editors

## Testing

Verified locally:

- `npm run lint`
- `npm run build`

## Notes

Recommended builder choices after this PR:

- `Drive Your Career Forward`: `Deep Brand Curve`
- `Join our Team`: `Light Cross Wave Top`
- `Fuel your passion with purpose`: `Light Cross Wave Bottom` if you want the upper section to own that divider instead of the jobs section below it
