# Ridemax Mini-CMS Architecture

_Last updated: 2026-04-18._

This document describes the simplest system that satisfies the non-negotiable requirements
Ridemax's marketing, operations, and security stakeholders have surfaced. It is the companion
to `migration.md` (which covers the Vercel + Supabase → AWS cutover) and `admin-options.md`
(which covers the runtime environment variables). Read this first when onboarding a new
engineer — `migration.md` assumes the reader already understands the shape laid out here.

## Non-negotiable requirements

The CMS exists to serve five invariants. Every design decision below is traceable back to
one of them.

1. **Marketing controls all editorial content.** Every text string, image, and video that
   appears on the public site — heroes, section copy, promotions, events, careers, navigation,
   logos — is configurable from the admin surface without a code deploy.
2. **Product data is a read-only invariant.** Prices, stock, SKUs, and technical specs live
   in Ridemax's third-party warehouse. The marketing site must render that catalog but must
   never be the system of record for it, and must never connect directly to the warehouse
   database.
3. **The public surface is a DDoS target.** The stack must be reasonable to defend with
   off-the-shelf edge controls (CDN caching, WAF, rate limits) and degrade to a safe,
   cached view when origins are down.
4. **Uploads must work from a phone.** The marketing team shoots on modern phones that
   produce 4–8 MB JPEGs. The upload pipeline must accept those files and normalize them
   without surfacing confusing errors.
5. **The platform is cost-proportional to traffic.** Idle cost stays near zero; peak cost
   stays bounded by the CDN, not the origin.

The rest of this document shows how the chosen architecture delivers each of those.

## High-level shape

```
                    ┌────────────────────────────────────────┐
                    │            CDN + WAF                   │
                    │ (CloudFront + AWS WAF — or Vercel Edge │
                    │  during the transition)                │
                    └────────────────────────────────────────┘
                              │ static: long-TTL cache
                              │ dynamic: short-TTL SWR
                              ▼
                    ┌────────────────────────────────────────┐
                    │      Next.js app (App Router)          │
                    │  — public pages, admin CMS, API routes │
                    └────────────────────────────────────────┘
               ┌───────────────┬─────────────────┬───────────┐
               ▼               ▼                 ▼           ▼
         ┌──────────┐    ┌───────────┐    ┌────────────┐ ┌──────────┐
         │ Supabase │    │ Supabase  │    │ Warehouse  │ │ Admin    │
         │ Postgres │    │ Storage   │    │ read API   │ │ auth     │
         │ (CMS)    │    │ (media)   │    │ (products) │ │ (cookie) │
         └──────────┘    └───────────┘    └────────────┘ └──────────┘
```

There are only four persistence tiers, each with a tightly-scoped job:

- **CMS database** — Supabase Postgres holds editorial content (pages, blocks, events,
  promotions, careers, contact settings, navigation, media asset metadata). This is the
  only tier the admin writes to.
- **Media storage** — Supabase Storage (or S3 in the AWS target state) holds the bytes of
  uploaded images. The CMS database stores URLs, not blobs.
- **Warehouse catalog** — a Ridemax-internal HTTPS API exposes a read-only product catalog.
  The marketing site reads from it; it never writes.
- **Admin auth** — a SHA-256 cookie signed with a server secret. No user tables, no OAuth
  dependency. (A future ecommerce buildout will introduce a buyer identity tier; that is
  explicitly out of scope here — see "Future: ecommerce" below.)

## Content model

The CMS is intentionally small. There are exactly four kinds of editable entity; adding a
fifth should require an architecture review.

| Entity         | What it is                                                           |
| -------------- | -------------------------------------------------------------------- |
| Site settings  | Logos, footer copy, contact info, social links, search placeholder.  |
| Pages          | Ordered list of typed blocks per public URL (home, about, careers…). |
| Time-bounded   | Events and promotions with start/end dates, hero media, and copy.    |
| Catalog meta   | Non-price facets attached to product categories (banner, tagline).   |

### Page blocks, not hardcoded sections

Each public page (`/`, `/about`, `/careers`, `/news`, `/events`, `/promotions`, product
category index pages) renders a `PageDocument`: an ordered list of `PageBlock` records.
Every block type (`richText`, `hero`, `mediaStrip`, `collection`, `tileGrid`, `featureList`,
`video`…) is a deep module that owns its own rendering and its own admin fields. A new
block type only touches three places: `page-builder.ts` (field schema), a React renderer
(public page), and a rendering fallback in the admin. That keeps the feature flag surface
small.

_Why blocks instead of page-specific forms?_ The Wix reference design the marketing team
is replicating uses a block editor. Anything page-specific in the admin would have to
be edited in lockstep with the public template whenever marketing wanted to rearrange a
page — which is the exact cost the Wix workflow exists to avoid.

### Product data as an invariant

The `lib/server/ridemax-content-repository.ts` module exposes `getProductCatalog()` and
treats its output as read-only. The admin has no UI to edit it. Three ingestion modes are
supported; all three converge on the same in-memory shape so public pages don't need to
know where the bytes came from:

1. **`remote-api`** (target state) — GET the warehouse's REST endpoint on each request,
   cached at the Next.js data-cache layer (60 s stale-while-revalidate in prod). The
   warehouse team owns rate limits; we own the cache TTL.
2. **`local-json`** (current state + local dev) — read `data/catalog-products.json` from
   disk. Useful for staging without a live warehouse and for reproducible local dev.
3. **`sync-to-postgres`** (future) — scheduled job materializes the warehouse feed into
   a `catalog_products` read replica table. Only considered if the warehouse API's
   latency or availability can't meet the public site's SLO.

The network boundary to the warehouse is a thin adapter. The warehouse API key lives in
`RIDEMAX_PRODUCTS_API_KEY` (server-only). Browser code never sees it.

Price data explicitly never flows through the CMS. Marketing cannot edit price; engineers
cannot patch price outside the warehouse. If a product is missing or retired in the
warehouse it is hidden from the public site by the catalog layer, not by the CMS.

#### Ingestion options for the EC2/Docker deployment

The architecture supports three shapes — pick the simplest that meets the SLO. All share
one rule: the marketing app has **read-only credentials**, routed through a dedicated
IAM/service account, and can never reach the warehouse's primary DB.

1. **Pull over HTTPS** (default). The marketing container calls the warehouse REST API
   with a short-lived signed token. Responses are cached 60 s at the Next cache, 5 min
   at the CDN. This is the cheapest and DDoS-friendliest option because cold traffic
   spikes are absorbed at the edge.
2. **S3 snapshot feed**. The warehouse writes a gzipped JSON snapshot to an S3 bucket
   every N minutes; the marketing container downloads the latest pointer at boot and
   on a schedule. Use this when the warehouse API cannot sustain public-traffic QPS.
3. **Read replica via Debezium/DMS**. The warehouse publishes CDC events to a
   marketing-owned Postgres read replica. Highest fidelity, highest ops cost. Only worth
   it if the public site needs sub-second reflection of warehouse changes (it does not
   today).

Never use a database-level direct connection to the warehouse primary. Never store
warehouse credentials in the browser bundle or in the CMS settings UI.

## Admin surface

The admin is a single Next.js route tree gated by two independent controls:

- **Hidden path slug.** When `ADMIN_PATH_SLUG=corgi-7f31` is set, `/admin/*` returns a 404
  (rewritten by `middleware.ts`) and the real admin is served at `/corgi-7f31/*`. This
  defeats automated `/admin` or `/wp-admin` scanners without introducing an auth UI. The
  slug is a shared secret, rotated quarterly.
- **HttpOnly admin cookie.** Admin login issues a SHA-256 cookie signed with
  `ADMIN_COOKIE_SECRET`. The cookie is `HttpOnly`, `Secure`, and `SameSite=Lax`. There is
  no user table; there is a single operator shared via a password manager.

If both controls are absent (local dev), the admin is reachable at `/admin` without auth.
That is the only environment where that is acceptable.

### Admin UX guardrails

- All lists (events, promotions, careers, pages, page blocks, tiles) use the same drag
  handle and the same `ArrowUp` / `ArrowDown` / `Trash` icon buttons. Consistency is a
  feature — marketing learns it once.
- Uploads go through `/api/upload`, which enforces `RIDEMAX_UPLOAD_MAX_MB` (default 2,
  cap 25). The server normalizes images to WebP at quality 82, width 1920, so the
  marketing team can hand in phone-sized JPEGs without producing multi-megabyte hero
  images on the public site.
- Media backend is selected at boot by the server:
  - Supabase (when `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set)
  - S3 (when `RIDEMAX_MEDIA_BUCKET` + `AWS_REGION` are set)
  - Local filesystem (dev only; refused on Vercel/Lambda, which are read-only)

### File-size and format policy

Upload policy is centralized so the admin, the chat widget, and any future buyer-facing
upload (returns, RMA images, etc.) use one rule:

| Control                           | Default | Rationale                              |
| --------------------------------- | ------- | -------------------------------------- |
| `RIDEMAX_UPLOAD_MAX_MB`           | 2 MB    | Modern phone JPEGs post-compress.      |
| Server-side JPEG re-encode        | off     | Preserve marketing's chosen crop.      |
| Server-side WebP pipeline         | on      | Width 1920, quality 82.                |
| Accepted MIME types (admin)       | jpeg/png/webp | No SVG from untrusted uploads.    |
| Rate limit (admin upload)         | 30/min  | Throttled per admin session.           |
| Rate limit (chat upload)          | 10/min  | Throttled per client IP.               |
| Chat upload max size              | 8 MB    | Phone-camera friendly for customers.   |

The cap is expressed in env vars so a campaign that actually needs 8 MB panoramic hero
images can ship without a code change.

## Public performance and DDoS posture

### Caching

- Public pages are rendered server-side and marked `revalidate = 60`. The CDN keeps the
  rendered HTML at the edge and absorbs burst traffic.
- The product catalog is cached at the Next data layer (60 s, SWR). A warehouse incident
  degrades to stale catalog, never to a 500.
- Uploaded images are served from Supabase/S3 through the CDN with a 30-day cache and a
  fingerprinted URL. Admin uploads never invalidate the CDN — each upload gets a new URL.

### Defense in depth

- **Edge WAF** blocks known bad bots and enforces IP-based rate limits before the origin
  sees them. OWASP core ruleset + a Ridemax-maintained allowlist for admin IPs.
- **App-layer rate limiting** (`lib/server/rate-limit.ts`) guards `/api/upload`,
  `/api/chat-upload`, `/api/contact`, and auth endpoints. Memory-backed in dev; Redis or
  ElastiCache in prod.
- **Admin isolation.** The admin slug is rewritten by middleware before any render. A
  scanner hitting `/admin` or `/wp-admin` sees a 404 page rendered from the regular
  marketing 404 template — no fingerprint for the admin framework.
- **No user-supplied HTML rendering.** Rich-text blocks render sanitized Markdown only.
  The chat widget stores uploaded URLs, never user HTML.
- **No direct browser writes.** Every write path goes through a server route that
  validates the payload against a Zod schema (see `lib/content-schemas.ts`) before it
  reaches Postgres or storage.

### Blast radius

The admin cookie secret, the warehouse API key, and the Supabase service-role key are
the three secrets worth stealing. Each has a different rotation cadence:

| Secret                          | Rotation cadence | Rotation procedure                                  |
| ------------------------------- | ---------------- | --------------------------------------------------- |
| `ADMIN_COOKIE_SECRET`           | Quarterly        | Rotate env var; all sessions invalidate.            |
| `ADMIN_PATH_SLUG`               | Quarterly        | Rotate env var; share new slug via password vault.  |
| `RIDEMAX_PRODUCTS_API_KEY`      | On warehouse team request | Coordinate with warehouse ops.            |
| `SUPABASE_SERVICE_ROLE_KEY`     | On suspicion     | Rotate in Supabase console; redeploy.               |

## Cost posture

At current traffic (low five-digit monthly visitors) the dominant costs are:

- **Vercel Pro + Supabase Pro** — ~$45/mo combined. Well within marketing budget.
- **Supabase Storage** — <$1/mo for uploaded media at current volume.
- **CDN egress** — folded into Vercel's included egress.

In the AWS target state the shape is:

- **CloudFront + S3** for static/public assets. Pennies per GB.
- **ALB + EC2 (t4g.small or Fargate Spot)** for SSR. A single instance handles the
  current baseline with a scale-out policy at 60 % CPU.
- **RDS Postgres (db.t4g.small)** for the CMS DB. Multi-AZ optional; current traffic
  does not need it.

The design deliberately avoids Lambda for the main request path during the AWS cutover.
Next.js `standalone` + EC2 keeps response latency and cold-start pathologies off the
critical path, which matters for Core Web Vitals.

## Future: ecommerce

The architecture is chosen so ecommerce ("add to cart", "checkout") can be added without
a second migration. Specifically:

- The product catalog layer is already a read-only seam. Cart state sits in front of it.
- A cart service would introduce a new persistence tier (DynamoDB or a Postgres
  `carts` table) and a new auth tier (buyer accounts). Neither is required yet.
- Payments are out of scope for the marketing site; when added they will be a separate
  service that the cart service calls into.
- The chat widget's upload path can be reused for RMA/returns photos without change.

The rule is: **keep the marketing app unchanged except for adding a `Cart` block type**
and render the cart UI from a dedicated service behind `/shop/*` routes. Do not fold
buyer state into the CMS database.

## What changes if a requirement changes

- **"We want a new editable section."** Add a new `PageBlock` type in `page-builder.ts`,
  a renderer, and (optionally) a new admin fieldset. No migration.
- **"We want a new product facet."** Talk to the warehouse team first. If it's truly a
  non-price facet the marketing team owns (e.g., a banner tagline), add it to the
  `catalogMetaFacets` table, not to the warehouse.
- **"We want to swap Supabase for AWS."** Follow `migration.md`. The app already selects
  its backend at boot from env vars, so the public-facing behavior is unchanged.
- **"We want a second language."** This is the biggest latent complexity. Add a `locale`
  column to the CMS tables and a `[locale]` segment to the App Router. The block model
  already scopes content per document, so translation is per-block.

## Decision log — roads not taken

- **Headless CMS (Contentful, Sanity).** Rejected: the editorial volume doesn't justify
  the SaaS fee, and every integration we'd need to build (media pipeline, auth, slugging)
  is cheap in Next.js. The Wix reference design is also block-based, so the fit for a
  block-oriented Postgres schema is tighter than for an external CMS's page model.
- **Strapi self-hosted.** Rejected: operationally heavier than Postgres + a typed admin
  form. Adds a second runtime without removing any complexity from this one.
- **Static export.** Rejected: admin editing requires a runtime. We could static-export
  the public pages while keeping the admin as a separate service, but the operational
  savings do not outweigh the complexity of keeping two deployments in sync.
- **Firebase.** Rejected: the catalog read path wants a relational shape (category →
  items) and the CMS wants strong transactional writes. Postgres fits both; Firestore
  fits neither cleanly.
- **Direct warehouse DB access.** Rejected on security grounds — the marketing app
  sits on the public internet and would become a pivot point into Ridemax's inventory
  system. The HTTPS seam is the whole point.

## Invariants to protect in code review

Whenever something in this file contradicts what the code does, one of them is wrong.
Pay special attention to these invariants during review:

- The admin never writes to the warehouse catalog.
- The public site never reads a warehouse credential.
- `/api/upload` always enforces `RIDEMAX_UPLOAD_MAX_MB`, never an unchecked file size.
- Media backend selection is a pure function of env vars; no runtime toggle from the UI.
- Page blocks own their admin schema; there is no page-specific form.
- Every text, image, and video on the public site is backed by a CMS field.
