# Ridemax Marketing CMS — Step-by-Step Implementation Plan

This plan covers the outstanding design-system, media, rich-text, draft/publish,
admin-UX, and admin-security work. It is organized as **phases** so the complexity
stays incremental (AGENTS.md §1). Each phase is independently shippable and
independently testable.

Already done in the repo (skip):

- Cloudflare Turnstile client widget + server verification — `components/contact-form.tsx:120-238`, `lib/server/contact-protection.ts:12-68`, `app/api/contact/route.ts:29-43`.
- Honeypot field on contact form.
- Per-IP rate limit — `lib/server/rate-limit.ts:13-29`.

---

## Design principles applied throughout

These are the AGENTS.md rules that shape the decisions below:

- **Deep modules, simple interfaces.** Marketing should choose a *preset*, not
  a dozen per-block layout knobs (§3, §7).
- **Information hiding.** A block does not decide its own mobile breakpoints;
  the preset does (§4).
- **Define errors out of existence.** Upload accepts any supported image up to
  6000 px; the pipeline produces the variants and focal-point crops — the user
  cannot produce a broken layout (§8).
- **Stable backend identity, display label separate.** `slug = "home"` in DB,
  label = "Home" in UI. Never rename slugs for display (§11 Choose Names
  Carefully, §13 Consistency).

---

## Phase 1 — Admin shell UX (1–2 days)

### 1.1 Move logout to the sidebar footer

**Why.** Marketing should not have to scroll to Dashboard to log out. Every
major CMS (WordPress, Ghost, Sanity, Strapi, Contentful) puts the user menu /
logout at the bottom of the sidebar or in a top-right avatar menu.

**Files**

- `components/admin-sidebar.tsx` — add a pinned footer section with user email
  + Logout button.
- Remove the logout button from `components/admin-dashboard.tsx:1610-1614`.

### 1.2 Replace the customer navbar inside /admin

**Why.** Admin chrome and public chrome are different concerns. Mixing them
leaks public layout decisions into the editor (AGENTS.md §4 Information
Leakage).

**Files**

- `app/admin/layout.tsx` — stop rendering the public `<SiteHeader />`.
- Replace it with a thin admin topbar: left = breadcrumbs, center = search
  (see 1.3), right = Save / Preview / Publish buttons + user avatar.

### 1.3 Command-palette search (⌘K / Ctrl+K)

**Why.** Proven pattern: Linear, Notion, Sanity Studio, Vercel, Shopify admin.
Replaces sidebar-scroll and long menu paths with one input.

**What it searches**

- Pages (from `site_content_documents`)
- Collections rows (brands, news, events, promotions, awards)
- Actions ("New event", "Go to promotions", "Publish home")

**Files**

- New: `components/admin-command-palette.tsx` (use `cmdk` — the same library
  Linear and Vercel use; 6 KB, zero-dep, accessible).
- Mount inside `app/admin/layout.tsx`.
- Index source: a single helper in `lib/server/admin-search-index.ts` that
  reads the JSONB doc + collection tables and returns `{label, href, kind}[]`.

```bash
npm install cmdk
```

### 1.4 Fix action button layout (Edit / Move Up / Move Down / Delete)

**Why.** Currently wraps on narrow screens. Horizontal row, no wrapping,
equal spacing.

**Files**

- Find the row in `components/admin-dashboard.tsx` (grep for `Move Up`).
- Wrap in a `flex items-center gap-2 whitespace-nowrap` container; set
  `min-w-0` on the label column so the name truncates instead of pushing
  buttons to a new line. Use `flex-shrink-0` on the button group.

### 1.5 Keep "Preview" and "Exit Preview"

**Why.** This is the CMS idiom — Wix, WordPress, Contentful, Sanity all have
it. Marketing already expects it. Keep it; only move it to the topbar next
to Save / Publish so it's always one click away.

---

## Phase 2 — Draft / Publish model (2–3 days)

### 2.1 Schema

Add to `site_content_documents`:

```sql
ALTER TABLE site_content_documents
  ADD COLUMN draft_content     JSONB,
  ADD COLUMN published_content JSONB,
  ADD COLUMN last_published_at TIMESTAMPTZ;

-- Backfill: copy existing `content` into published_content
UPDATE site_content_documents
   SET published_content = content,
       last_published_at = updated_at
 WHERE published_content IS NULL;
```

New table for revisions:

```sql
CREATE TABLE site_content_revisions (
  id          BIGSERIAL PRIMARY KEY,
  slug        TEXT NOT NULL REFERENCES site_content_documents(slug) ON DELETE CASCADE,
  content     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT,                    -- email or admin identifier
  note        TEXT
);
CREATE INDEX site_content_revisions_slug_idx ON site_content_revisions(slug, created_at DESC);
```

**Slug stays stable.** `home` stays `home`. The *label* "Home" lives in the
admin UI only — do NOT rename slugs.

### 2.2 Repository API (deep module, simple interface)

`lib/server/ridemax-content-repository.ts`:

```ts
export interface ContentRepository {
  // Reads
  getPublished(slug: string): Promise<Content | null>;
  getDraft(slug: string):     Promise<Content | null>;          // falls back to published
  listRevisions(slug: string, limit?: number): Promise<Revision[]>;

  // Writes
  saveDraft(slug: string, content: Content, author: string): Promise<void>;
  publish(slug: string, author: string, note?: string):      Promise<void>;
  revertTo(slug: string, revisionId: number, author: string): Promise<void>;
}
```

`publish()` is the only operation that writes `published_content` and appends
to `site_content_revisions`. The public site calls `getPublished()`. Preview
mode calls `getDraft()`. This is the deep-module pattern (AGENTS.md §3).

### 2.3 UI — Save / Preview / Publish buttons

Add to the topbar (see Phase 1.2):

- **Save** → `saveDraft()` — always enabled, debounced autosave every 30 s.
- **Preview** → opens `/?preview=1` in a new tab, Next Draft Mode on.
- **Publish** → confirm modal → `publish()`.
- **Revision history** → drawer listing `listRevisions()`; click = `revertTo()`.

Follow-up marketing training: "Save ≠ Publish. Publish is what customers see."
Wix trained your team on exactly this mental model, so the switch is free.

---

## Phase 3 — Card preset system (1–2 days)

### 3.1 The preset

A single discriminated union in `lib/page-builder.ts`:

```ts
export type CardPreset =
  | { kind: "standard";     showTeaser: boolean }
  | { kind: "imageOverlay"; overlayOpacity: 0.3 | 0.5 | 0.7 }
  | { kind: "brandLogo";    background: "surface-1" | "surface-2" };
```

Add `cardPreset?: CardPreset` to `CollectionGridBlock` and `FeatureGridBlock`
in `lib/page-builder.ts:74-88`.

**Why one preset, not three knobs for each block.** Marketing picks an
intent, not a layout. The preset owns the mobile breakpoints, so marketing
cannot produce an inconsistent mobile layout. This is the Webflow CMS
Collection Templates pattern.

### 3.2 Rendering

In `components/marketing-page-renderer.tsx`, refactor the three card
render functions (brand 153-186, news 188-221, event 223-257) into:

```ts
function renderCard(item: CollectionItem, preset: CardPreset) {
  switch (preset.kind) {
    case "standard":     return <StandardCard     item={item} showTeaser={preset.showTeaser} />;
    case "imageOverlay": return <ImageOverlayCard item={item} opacity={preset.overlayOpacity} />;
    case "brandLogo":    return <BrandLogoCard    item={item} surface={preset.background} />;
  }
}
```

Each card component owns its breakpoints internally. Grid wrapper is always
`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` — marketing does not
control columns. That guarantees mobile consistency.

### 3.3 Admin UI

In the CollectionGrid block editor, replace the current free-form fields
with a single `<RadioGroup>` showing three thumbnail previews of the
presets. Click = applies.

---

## Phase 4 — Media pipeline (3–5 days)

### 4.1 Upload once, generate many variants

On upload, run `sharp` to produce:

| Variant    | Width  | Format       | Use case                   |
|------------|--------|--------------|----------------------------|
| `hero`     | 1920   | AVIF + WebP  | Hero blocks                |
| `card`     | 800    | AVIF + WebP  | Collection card            |
| `thumb`    | 320    | AVIF + WebP  | Admin picker, mobile card  |
| `og`       | 1200×630 | JPEG       | Open Graph                 |

Store variants in S3/Supabase at
`{assetId}/{variant}.{format}`. Keep the original for re-derivation.

**Files**

- `lib/server/media-pipeline.ts` — new. One function
  `processUpload(buffer, mime): Promise<ProcessedAsset>` that returns all
  variants. Deep module: caller gets an object of URLs, knows nothing
  about sharp.
- `app/api/upload/route.ts` — wire into `processUpload()` after current
  type/size validation (already 10 MB, JPEG/PNG/WebP only — tighten to
  5 MB per your spec; allow AVIF input too).
- `supabase/schema.sql` — add `variants JSONB` to media_assets table,
  storing `{ hero: {avif, webp}, card: {...}, thumb: {...}, og: {...} }`.

### 4.2 Responsive `<img>` output

Export a `<CmsImage asset={...} usage="card" />` component in
`components/cms-image.tsx` that renders:

```tsx
<picture>
  <source type="image/avif" srcSet={asset.variants[usage].avif} />
  <source type="image/webp" srcSet={asset.variants[usage].webp} />
  <img src={asset.variants[usage].webp} loading="lazy" decoding="async"
       width={...} height={...} alt={asset.alt}
       style={{ objectPosition: focalPointCss(asset.focalPoint) }} />
</picture>
```

Replace `next/image` usages in `marketing-page-renderer.tsx` card renderers
with `<CmsImage>` so marketing sees consistent output per block. `next/image`
stays fine for hero art; switching the card renderers is enough.

### 4.3 Focal point

Add `focal_point JSONB` (default `{x: 0.5, y: 0.5}`) to media_assets.

Admin UI: in the media detail drawer, click on the image to set the focal
point. Render a dot at the click position, store `{x, y}` normalized 0–1.
All variant crops center on the focal point (sharp's `extract` with offset
computed from focal point).

### 4.4 Upload validation (tighten existing)

Already partial — finish it in `app/api/upload/route.ts`:

- Accept: JPEG, PNG, WebP, AVIF only.
- Max size: 5 MB (down from 10 MB per your spec).
- Sniff magic bytes (don't trust `Content-Type`): `file-type` npm package.
- Strip EXIF with sharp (`.rotate().withMetadata({exif: {}})`) — removes GPS
  and any embedded scripts.
- Reject dimensions > 6000 px on either axis.

```bash
npm install file-type
```

### 4.5 Per-block preview in admin

Inside the media picker, show three small thumbnails labeled "Hero",
"Card", "Thumb" rendered from the actual variants. Marketing sees exactly
what publishes.

---

## Phase 5 — Constrained rich text (Tiptap) (2 days)

### 5.1 Why Tiptap

You already made this decision correctly. Tiptap's schema restricts allowed
nodes/marks at the editor level, and its JSON output serializes cleanly to
JSONB. Lexical is also fine but heavier to customize.

### 5.2 Allowed schema (the constraint IS the design)

```ts
// lib/rich-text/schema.ts
export const richTextExtensions = [
  StarterKit.configure({
    heading:   { levels: [2, 3] },   // no H1 — page owns H1
    bulletList: {}, orderedList: {}, blockquote: {}, codeBlock: false,
  }),
  Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener" } }),
  // NO: font family, font size, color, text-align, inline styles.
];
```

No font picker. No color picker. No spacing controls. Headings are H2/H3
only (the page owns H1). All styling comes from design tokens on the
renderer side. This prevents the "mini Word" anti-pattern from your spec.

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

### 5.3 Storage

Persist `editor.getJSON()` into the existing `richText` block (currently
empty at `marketing-page-renderer.tsx:837-844`). Render with
`generateHTML(json, richTextExtensions)` on the server, or `<EditorContent
editor={readOnlyEditor}>` on the client.

### 5.4 Editor component

New: `components/rich-text-editor.tsx`. Toolbar: Bold, Italic, H2, H3, UL,
OL, Link, Clear formatting. That's it. Everything else is a design-token
decision, not a marketer decision.

---

## Phase 6 — Section background theming + decorative shapes (0.5 day)

Already scaffolded — `BlockAppearance` in `lib/page-builder.ts:252-286`
already has `background` + `decoration`. Two loose ends:

1. Expose it in the block editor UI (collapsible "Appearance" accordion
   inside each block).
2. Add alternating-surface auto mode on a page: a page-level toggle
   "Alternate section backgrounds" that assigns `surface-1 / surface-2`
   to consecutive blocks when they don't have an explicit override. That
   matches the Wix home-page example; careers page toggles it off.

---

## Phase 7 — Admin auth hardening (3–5 days)

This is the most important security work and the hardest to retrofit,
so do not defer it past Phase 4.

### 7.1 Replace password-only auth with Supabase Auth

Current state: single shared password → SHA256 cookie. No per-user
identity, no MFA, no way to revoke one user.

Migrate to Supabase Auth magic link + TOTP (built into Supabase). Files:

- `lib/server/admin-auth.ts` — replace `isAdminAuthenticated()` with a
  Supabase session check + role check (`role = 'admin'` in
  `public.admin_users`).
- `app/admin/login/page.tsx` — new magic-link login UI.
- `supabase/schema.sql` — `admin_users` table with `email, role,
  mfa_enabled, created_at`.

### 7.2 MFA (TOTP)

Supabase Auth exposes MFA enrollment primitives directly — wire the
enrollment UI in `app/admin/settings/security/page.tsx`. Require MFA for
any user with `role = 'admin'`.

### 7.3 Audit log

```sql
CREATE TABLE admin_audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,                   -- 'publish', 'draft.save', 'media.upload', 'login'
  target     TEXT,                            -- slug, asset id, etc.
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

One helper in `lib/server/audit.ts`:

```ts
export function logAdminAction(actor: string, action: string, target?: string, metadata?: unknown): Promise<void>;
```

Call it from every admin-write route: `publish`, `saveDraft`, `upload`,
`delete`, `login`. That's the minimum to satisfy "who changed what."

### 7.4 Access gateway (optional, for serious hardening)

Put Cloudflare Access (or AWS Verified Access) in front of `/admin/*` so
marketing logs in with SSO before they even see the login page. This is
the cheapest MFA upgrade if your team has a Google Workspace.

---

## Phase 8 — End-to-end tests (2 days, run last)

Use Playwright (`@playwright/test`). Four scenarios in `e2e/`:

### 8.1 Content lifecycle

```
test("marketing can publish a news item", async ({ page }) => {
  // login → navigate to News → create → upload image →
  // save draft → preview → verify not on public site →
  // publish → verify on public site
});
```

### 8.2 Image pipeline

Upload a 6000 px JPEG. Assert: `variants.hero.avif`, `variants.card.webp`,
`variants.thumb.avif` all exist at URLs returning 200 with correct MIME.

### 8.3 Broken image fallback

Delete a media asset referenced on a published page. Reload the page.
Assert: the site does not 500; the card shows a placeholder.

### 8.4 Access control + upload validation

- Anonymous user POSTs to `/api/upload` → 401.
- Admin POSTs a 6 MB file → 400 (over limit).
- Admin POSTs `evil.exe` renamed to `.jpg` → 400 (magic-byte check).
- Anonymous user GETs `/admin` → redirect to login.

### 8.5 Performance gate

After build, run Lighthouse CI against `/`, `/careers`, a promotion page.
Assert LCP < 2.0 s on mobile emulation. Fail CI on regression.

---

## Suggested execution order

If you ship Phase 1 first, marketing feels the improvement immediately
(no more hunting for Logout; ⌘K search; admin topbar separates from public
chrome). Phase 2 gives them the draft/publish mental model they already
know from Wix. Phase 3 removes the layout inconsistency. Phase 7 closes
the security gap *before* Phase 4 exposes more attack surface via the
media pipeline.

1. **Phase 1** — admin shell UX (logout, navbar, ⌘K, action buttons) — 1–2 days
2. **Phase 2** — draft/publish + revisions — 2–3 days
3. **Phase 3** — card preset system — 1–2 days
4. **Phase 7** — admin auth + MFA + audit log — 3–5 days
5. **Phase 4** — media pipeline (variants, focal point, validation) — 3–5 days
6. **Phase 5** — Tiptap rich text — 2 days
7. **Phase 6** — alternating surfaces toggle — 0.5 day
8. **Phase 8** — E2E + Lighthouse CI — 2 days

Total: ~3 weeks of focused work.

---

## What NOT to build (explicit non-goals)

Per AGENTS.md §5 — General-Purpose Modules Are Deeper, don't over-engineer:

- **No hover brightness slider for marketing.** Pick one hover treatment
  per preset and own it in CSS. Exposing hover intensity as a CMS field is
  a shallow knob.
- **No arbitrary font/spacing/color in rich text.** Already covered above.
- **No block-level column count.** Grid column count is a preset concern.
- **No "Page" → "Home" rename at the slug level.** Display label only.
