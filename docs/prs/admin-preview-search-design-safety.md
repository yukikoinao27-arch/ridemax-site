# PR Draft: Admin Preview, Search UX, and Safe Builder Controls

Branch: `codex/admin-preview-search-design-safety`

## Summary

This PR fixes the deployed admin preview path and tightens the marketing-facing admin UX:

- move Preview away from Vercel-local temp files and onto the existing draft storage flow
- make quick search matches navigate on normal click while preserving Ctrl/Cmd-click behavior
- remove manual Search sort buttons; sort dropdown changes now submit automatically
- hide empty tire-brand product result panels when a brand has no attached products yet
- remove the admin overview "Security Footprint" developer/ops panel
- add preset-based Heading Style and Text Color Scheme controls to Section Appearance
- make appearance choices constraint-aware so unsafe text/shape combinations are disabled or normalized
- keep the Page picker reachable while scrolling through collapsed page-builder sections
- make product Brand selection a dropdown from the active category's brand cards

## Preview Behavior

Preview now means:

1. validate the current admin content and catalog draft
2. save both as draft data
3. enable Next.js Draft Mode for the admin browser
4. open the public URL with the draft content visible

This fixes the Vercel error:

`EROFS: read-only file system, open '/var/task/data/preview-site-content.json'`

The previous route tried to write a temp JSON preview file inside `/var/task`, which is read-only on Vercel.

## Marketing Admin Pattern

Recommended proven pattern for the 3-5 marketing users:

- keep `/admin` as the entry point, but move from a shared password toward named admin identities
- use email login with either magic links or email/password plus 2FA/TOTP
- maintain an allowlist of approved company emails
- record actor email, action, entity type, entity id, timestamp, and a short metadata summary for saves, publishes, restores, archives, and future deletes
- keep revision history as a right-side drawer, but label it "Version History" and show simple cards: who changed it, when, what changed, Preview, Restore as Draft

The current app already logs save/publish/restore/archive actions to `admin_activity_log` when Supabase is configured. This PR keeps that model and also treats Preview as a draft-producing action.

## Section Appearance

The page builder now starts moving toward a constraint-based design system:

- no free-form text color controls
- no free-form heading style controls
- light text is disabled on light section backgrounds
- shape colors matching the current background are disabled once a visible shape is selected
- large shapes are disabled/normalized for compact heroes
- hero height is now a safe dropdown instead of a raw Tailwind class field

Example block appearance:

```json
{
  "background": "surface-1",
  "headingScale": "display",
  "headingStyle": "emphasis",
  "textColorScheme": "dark",
  "decoration": {
    "style": "wave",
    "position": "bottom",
    "size": "md",
    "color": "brand-red"
  }
}
```

## Archive And Accountability Options

Recommended inbox pattern:

- show `Active` and `Archived` tabs in Contact Inbox and Careers Applications
- let marketing restore archived items
- allow permanent delete only for owner/admin role, not every marketing editor
- default retention: keep archived messages and applications for 12 months, then export or purge with an ops-approved job

For this company use case, "Archive" should mean "remove from daily work but keep the record." Permanent delete should be rare because contact leads and job applications can matter later.

## Careers Form Option

The app already has a job application storage path and admin careers inbox. The next production-ready step is to connect the public Apply flow to:

- basic details
- resume attachment
- cover letter/message
- HR email notification through a provider such as Resend, Postmark, or SendGrid
- stored application record in Supabase so HR can still review even if an email is missed

## Featured And Published

Keep both checkboxes:

- `Published` controls whether a specific item appears on the public site after publish
- `Featured` controls merchandising, such as homepage cards, campaign highlights, and featured roles
- Save Draft / Preview / Publish are workflow controls for the whole content bundle

These solve different problems, so they should remain but can be relabeled later as `Visible on Site` and `Featured`.

## Wix Image URLs

`https://static.wixstatic.com/...` URLs in revision JSON are imported historical media URLs from the old Wix site. They are not a moving-animation fallback by themselves.

If marketing replaces the current image list and publishes, the public site uses the new images. The right-to-left movement is controlled by the page-builder block direction, not by Wix. Old revision snapshots can still restore old Wix URLs if someone explicitly restores that version.

## Testing

Verified locally:

- `npm run lint`
- `npm run build`

Manual deployed checks after Vercel finishes building:

- Save Draft, then Preview opens the edited public page in Draft Mode
- Search quick match click routes without needing Ctrl/Cmd-click
- Search sort dropdown updates results without a separate Sort button
- `/products/tires?brand=...` does not show the empty product/filter panel when no products are attached yet
