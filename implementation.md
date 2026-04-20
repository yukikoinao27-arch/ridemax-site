# Ridemax CMS And AWS Rollout

## What changed in the app

The app now follows the architecture direction from the redesign brief:

- `data/site-content.json` is the CMS bundle for editorial content.
- `data/catalog-products.json` is the read-only catalog seed.
- `data/media-library.json` is the local metadata fallback for uploaded assets.
- `pages[]` is the new source of truth for marketing pages.
- `promotions[]` is a first-class collection with hosted `videoUrl` support.
- Product inventory is no longer edited in the CMS. The admin only manages category presentation, page blocks, and merchandising content.
- `catalogSource` defines whether products come from local JSON or a remote API.
- `/api/upload` now handles image upload, optimization, and storage for CMS image fields.

## Recommended architecture for your real app

### Best fit for your current business setup

Because you already run multiple EC2 instances and want one AWS billing path, the best near-term deployment is:

1. `CloudFront` in front of the public domain
2. `AWS WAF` attached to CloudFront
3. `Application Load Balancer` behind CloudFront
4. One or more `EC2` instances running this Next.js Docker container
5. `S3` for image/media assets
6. Optional `ECR` for image storage
7. Optional `RDS PostgreSQL` later when you want durable CMS storage beyond mounted JSON files

This keeps your costs and operations inside AWS without forcing a jump to ECS on day one.

### Product integration choice

For this app, the right order is:

1. `API-based ingestion` first
   This is the best default because the product catalog is read-only here and your app mainly needs validated, logged access to external inventory.
2. `Scheduled sync` second
   Use this when the supplier API is slow, rate-limited, or you want cached snapshots instead of live reads.
3. `Queue worker` later
   Move here only when catalog updates become heavy enough that sync jobs should be decoupled from the web app.

Avoid:

- Direct SQL imports
- Admin upload of raw database dumps
- Letting marketing edit invariant product rows directly

## Security decisions

### Do you still need rate limiting on EC2?

Yes.

Moving from Vercel to EC2 does **not** remove the need for rate limiting. It just changes where the strongest limit should live.

Recommended split:

- `AWS WAF` for broad request flooding and abusive IP patterns
- `ALB` or reverse proxy limits for coarse request protection
- App-level rate limits for sensitive routes like `/api/search`, `/api/contact`, and `/api/admin/login`

This repo now includes lightweight app-level rate limits on search, contact, and admin login. Keep the stronger DDoS controls at AWS edge level.
The current app-level limiter is in-memory per container, so it is a useful local guardrail but not your only production-wide quota once multiple EC2 instances are serving traffic.

### Do you still need JWT auth for admin?

You still need real admin authentication, but raw browser JWTs are not the best default for this app.

Best path:

1. Short term: secure cookie session or the existing password gate
2. Medium term: AWS Cognito, Auth0, or your company SSO with server-side session cookies
3. Only use JWTs directly in the browser if you truly need cross-client token exchange

For a marketing CMS on EC2, secure cookie-based auth is usually simpler and safer than building a custom JWT flow.

### Do you still need input validation?

Yes, absolutely.

Validation is required regardless of hosting platform. This repo now validates:

- admin content saves
- contact submissions
- catalog payload parsing

## Media strategy

### Promotions video

Promotions should store only:

- `videoUrl`
- `thumbnail`

Do not upload promotion videos to your server.

Use:

- YouTube
- Vimeo

### Images

Use `S3 + CloudFront` for uploaded images.

This repo now uploads images through the admin CMS and still stores only image URLs in content records. For production media, add:

1. S3 bucket
2. CloudFront distribution
3. presigned upload flow
4. image size limit and MIME validation

Metadata such as filename, public URL, dimensions, and byte size belongs in PostgreSQL (or the current local JSON fallback), but the binary image should stay out of the database.

The current upload route already rejects video uploads and enforces a max upload size via `RIDEMAX_MEDIA_MAX_BYTES`.

## Dummy AWS account rollout

### 1. Prepare AWS resources

Create:

- one `ECR` repository for the image
- one `EC2` instance on Amazon Linux 2023
- one `security group` allowing:
  - `80` from ALB only
  - `443` from ALB only if terminating TLS on instance
  - no public `22` if you use Session Manager
- optional `ALB`
- optional `CloudFront`
- optional `WAF`
- one `S3` bucket for media

### 2. Build the container

This repo now includes:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `next.config.ts` with `output: "standalone"`
- `/api/health` for health checks

Build locally:

```bash
docker build -t ridemax-site:latest .
```

Or with Compose:

```bash
docker compose up --build
```

### 3. Push to ECR

Example flow:

```bash
aws ecr create-repository --repository-name ridemax-site
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag ridemax-site:latest <account>.dkr.ecr.<region>.amazonaws.com/ridemax-site:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/ridemax-site:latest
```

### 4. Install Docker on EC2

On Amazon Linux 2023:

```bash
sudo yum update -y
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user
```

Reconnect after adding the user to the `docker` group.

### 5. Pull and run on EC2

Create an app folder:

```bash
mkdir -p ~/apps/ridemax-site
cd ~/apps/ridemax-site
mkdir -p data
```

Create `.env.production`:

```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.example
RIDEMAX_ADMIN_PASSWORD=<strong-password>
RIDEMAX_MEDIA_MAX_BYTES=5242880

# Storage backend (priority order — first matching wins):
#   1) S3:        set both AWS_REGION and RIDEMAX_MEDIA_BUCKET
#   2) Supabase:  set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
#                 (bucket name defaults to "media", override with
#                 RIDEMAX_SUPABASE_MEDIA_BUCKET). Required on Vercel /
#                 any serverless host where the working directory is
#                 read-only — local FS would crash with ENOENT.
#   3) Local FS:  dev only, writes under ./data/media
AWS_REGION=<region>
RIDEMAX_MEDIA_BUCKET=<bucket-name>
RIDEMAX_MEDIA_PUBLIC_BASE_URL=https://<cloudfront-domain-or-public-bucket-base>
RIDEMAX_SUPABASE_MEDIA_BUCKET=media

# Optional external catalog
RIDEMAX_PRODUCTS_API_URL=
RIDEMAX_PRODUCTS_API_KEY=

# Optional Supabase JSON bundle fallback
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Minimal `docker run` example:

```bash
docker run -d \
  --name ridemax-site \
  --restart unless-stopped \
  --env-file .env.production \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  <account>.dkr.ecr.<region>.amazonaws.com/ridemax-site:latest
```

Or use Compose by copying `docker-compose.yml` to the instance and running:

```bash
docker compose up -d
```

### 6. Health checks

Point your ALB target group health check path to:

```text
/api/health
```

Expected success code:

```text
200
```

### 7. CloudFront and WAF

Recommended:

- CloudFront in front of the ALB
- WAF Web ACL attached to CloudFront
- one broad rate-based rule
- tighter rules for `/api/admin/login`, `/api/contact`, and `/api/search`

### 8. S3 media

Create:

- private S3 bucket for media
- CloudFront distribution in front of it
- Origin Access Control

Use CloudFront URLs in the CMS for uploaded images instead of direct S3 public URLs.

## Production hardening after dummy rollout

### Keep for production

- WAF
- rate limits
- validation
- health checks
- ALB
- CloudFront
- S3 media

### Upgrade before multi-instance scale

Move these off local disk:

- `site-content.json`
- `contact-messages.json`
- `catalog-products.json`
- process-local rate-limit state

Best next step:

1. move CMS bundle into `RDS PostgreSQL` or another durable store
2. move inbox storage into the database
3. move media asset metadata into PostgreSQL and keep image binaries in S3
4. move scheduled catalog sync into a worker or cron container

## Current app-specific recommendations

### Best real storage choice after the dummy phase

For your long-term AWS-only setup:

- `RDS PostgreSQL` for CMS bundle and inbox
- `S3 + CloudFront` for media
- `external API` for products

### Best auth choice after the dummy phase

- keep the current password gate for practice only
- move admin auth to Cognito or company SSO before production editors grow

### Best product model

Yes, this is the right model:

- products are read-only external data
- CMS controls:
  - category landing pages
  - hero copy
  - promotional placement
  - brand highlights
  - search visibility rules

## Pass log — admin shell + surface area hardening (Apr 17, 2026)

This pass focused on the two complaints that blocked day-to-day CMS use and
the two surface-area gaps that were making the hosting story fragile.

### Admin sidebar now lives in a shared layout

Before, every CMS link click triggered a full-document re-render because the
sidebar was rendered inside the `AdminDashboard` client component — which is
re-instantiated per route. That looked like the nav "blurring" between clicks
and visibly re-mounted the selection state.

- `components/admin-sidebar.tsx` owns the nav data and reads `usePathname()`
  to compute the active entry. No server props.
- `app/admin/layout.tsx` runs the auth check once and wraps authed children
  with the persistent chrome. When unauthed, `{children}` falls through so
  each page can still render its own sign-in form (layouts can't read
  `searchParams`).
- `AdminDashboard` and `AdminScreen` lost the grid wrapper and sidebar; they
  now render only per-view content. That also killed the duplicate
  `routeLinks`/`sectionAnchorsByView` tables.

### Logo is now a CMS field with light/dark variants

Previously `SiteHeader` hardcoded `/ridemax-logo-light.svg` for the
top-of-page state and `SiteFooter` had URL-string-equality override logic.
Editors couldn't swap in the real brand mark without a code change.

- `SiteSettings` gained `logoLightSrc` (dark-surface variant).
- Content schema accepts it with `.default("")` so existing bundles keep
  parsing.
- `SiteHeader`/`SiteFooter` fall back to `logoSrc` when the dark variant is
  empty, so a single-asset brand still works.
- Admin "Site Settings" exposes both as image uploads.

### Upload surface area tightened

- `/api/chat/upload` (unauthenticated 5 MB accept) was deleted. The chat
  widget never called it, so it was pure attack surface.
- `/api/upload` now reads `RIDEMAX_UPLOAD_MAX_MB` (capped at 25 MB) instead
  of a hardcoded 2 MB limit, and goes through the shared in-memory rate
  limiter at 30 req/min per IP. The admin cookie check still runs first.

### Known follow-ups, deferred

- `AdminDashboard` is still a 1800-line client component. Splitting it into
  per-view components (and promoting the page builder from inline forms to
  a true block editor) is the next obvious step, but was out of scope for
  this pass.
- The in-memory rate limiter is per-container. Behind an ALB with >1 task,
  limits are approximate. Promote to a shared store (Redis / DynamoDB
  counter) before horizontal scaling.

## Official references

- Next.js standalone output: https://nextjs.org/docs/app/api-reference/next-config-js/output
- Next.js deployment overview: https://nextjs.org/docs/app/getting-started/deploying
- Next.js `sharp` requirement for production image optimization: https://nextjs.org/docs/messages/sharp-missing-in-production
- Install Docker on Amazon Linux 2023: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/create-container-image.html
- Push Docker images to ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
- Session Manager for EC2 access: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-systems-manager-session-manager.html
- ALB target group health checks: https://docs.aws.amazon.com/en_en/elasticloadbalancing/latest/application/target-group-health-checks.html
- AWS WAF rate-based rules: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html
- CloudFront origin access control for S3: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
