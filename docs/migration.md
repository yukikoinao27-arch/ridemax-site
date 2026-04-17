# Vercel + Supabase → AWS Migration Playbook

Detailed, copy-pasteable steps to move the Ridemax site off Vercel/Supabase and
onto the production AWS architecture, with the failure modes you're most
likely to hit at each step.

## Target architecture

```
Internet
   │
   ▼
CloudFront (CDN, TLS, edge caching)
   │
   ▼
AWS WAF  ──────── managed rules (CRS, bad-bot, IP reputation) + custom rate-limit
   │
   ▼
Application Load Balancer (HTTPS, path-based routing, sticky cookie)
   │
   ▼
EC2 Auto Scaling Group ── 2× t3.small (or larger) running this Next.js Docker image
   │             │
   │             ├── pulled from ECR (private)
   │             └── runtime env from AWS SSM Parameter Store
   ▼
RDS PostgreSQL (Multi-AZ, t3.micro to start) ── replaces Supabase Postgres
S3 bucket (private, served via CloudFront) ──── replaces Supabase Storage
```

Why each piece:
- **CloudFront** — edge TLS, free egress to AWS origins, makes the origin DNS
  un-discoverable so WAF can shield it.
- **WAF** — OWASP CRS + a per-IP rate limit absorbs casual DDoS / bot traffic
  before it hits the Load Balancer. Required by the security goals.
- **ALB** — health checks + zero-downtime EC2 swaps; lets you blue/green deploy
  without users seeing a 502.
- **EC2 + ECR** — runs the same Docker image you build locally; ECR is the
  private registry so you don't push images to a public Hub.
- **RDS PostgreSQL** — durable, snapshotted, IAM-controlled. Schema is the
  same SQL in `supabase/schema.sql`, so no app code changes once the
  connection string is swapped.
- **S3** — replaces Supabase Storage for media. The app already supports both
  via [media-library.ts](../lib/server/media-library.ts); flipping providers
  is one env change.

---

## Phase 0 — Pre-flight checklist (do first, do once)

| Item | Why |
|---|---|
| AWS account with billing alarm at $50 / $100 / $500 | Catch a runaway WAF rule before payday. |
| Route 53 hosted zone for the domain | Required to point CloudFront and ACM at it. |
| ACM certificate **in us-east-1** for the apex + `www` | CloudFront only accepts certs from us-east-1. Issue early — DNS validation can take 30 min. |
| `aws` CLI v2 + `gh` CLI logged in | Most steps use the CLI. |
| Local Docker build works (`docker build -t ridemax-site .`) | If it fails locally it will fail in CI. |
| Snapshot of current Supabase project | Worst-case rollback baseline. Settings → Database → Backups → Download. |

**Common pre-flight errors**
- `An error occurred (ValidationException) when calling the RequestCertificate
  operation: ... must be in us-east-1`. Fix: `aws acm request-certificate
  --region us-east-1 ...`.
- `gh auth status` shows `not logged in`. Fix: `gh auth login --hostname github.com`.

---

## Phase 1 — RDS PostgreSQL

### 1.1 Provision

```bash
aws rds create-db-instance \
  --db-instance-identifier ridemax-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.4 \
  --allocated-storage 20 \
  --master-username ridemax_admin \
  --master-user-password "$(openssl rand -base64 24)" \
  --backup-retention-period 7 \
  --publicly-accessible false \
  --vpc-security-group-ids <sg-id-allowing-ec2> \
  --multi-az
```

Wait until `aws rds describe-db-instances --db-instance-identifier ridemax-prod
--query 'DBInstances[0].DBInstanceStatus' --output text` returns `available`
(roughly 8–12 minutes).

### 1.2 Apply the schema

```bash
psql "postgres://ridemax_admin:<pass>@<endpoint>:5432/postgres" \
  -f supabase/schema.sql
```

The file is written to be idempotent — re-running on a partially-applied
database is safe.

### 1.3 Migrate the data from Supabase

```bash
# Dump every public table, schema-only first to validate, then data.
pg_dump --schema=public --no-owner --no-privileges \
  "postgres://postgres:<supabase-pass>@db.<project>.supabase.co:5432/postgres" \
  > supabase-dump.sql

psql "postgres://ridemax_admin:<pass>@<endpoint>:5432/postgres" \
  -f supabase-dump.sql
```

**Likely errors and fixes**

| Error | Fix |
|---|---|
| `connection to server ... failed: timeout expired` | RDS security group does not allow your laptop IP. Add a temporary rule for your /32, or run `pg_dump`/`psql` from an EC2 jump host inside the VPC. |
| `permission denied for schema public` (during dump) | Use the Supabase superuser, not `anon`/`service_role`. The connection string is in Supabase dashboard → Settings → Database. |
| `role "supabase_admin" does not exist` (during restore) | Strip Supabase-internal grants: `pg_dump --no-owner --no-acl`. |
| `extension "pgcrypto" is not available` | Run `create extension if not exists pgcrypto;` against RDS first (already in `schema.sql`, but if you use a custom dump you may need it explicitly). |
| `relation "public.media_assets" already exists` on restore | Expected — you already ran `schema.sql`. Use `psql ... --set ON_ERROR_STOP=0 -f data-only.sql` after generating with `pg_dump --data-only`. |

### 1.4 Validate

```bash
psql ... -c "select count(*) from public.brands;"
psql ... -c "select count(*) from public.product_items;"
psql ... -c "select count(*) from public.media_assets;"
```

Counts must match Supabase. If they don't, repeat 1.3 with `--data-only` after
truncating the destination.

---

## Phase 2 — S3 bucket for media

### 2.1 Create the bucket and CloudFront distribution

```bash
aws s3api create-bucket \
  --bucket ridemax-media-prod \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-public-access-block \
  --bucket ridemax-media-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

The bucket stays **private**; CloudFront serves it via an Origin Access
Control. Public-on-the-bucket is a common ransomware vector.

### 2.2 Migrate existing media from Supabase Storage

```bash
# List every object in the Supabase 'media' bucket
psql "$SUPABASE_URL" -c "\COPY (
  select name from storage.objects where bucket_id = 'media'
) TO 'objects.txt'"

# Pull each one and re-upload to S3 (run inside a temp dir)
while read key; do
  curl -s -o "/tmp/$key" \
    "https://<project>.supabase.co/storage/v1/object/public/media/$key"
  aws s3 cp "/tmp/$key" "s3://ridemax-media-prod/$key" \
    --cache-control "public, max-age=31536000, immutable"
done < objects.txt
```

For >1k objects use `aws s3 sync` against a local mirror instead — it
parallelizes and resumes.

**Likely errors**
- `An error occurred (AccessDenied) when calling PutObject` → IAM user/role
  lacks `s3:PutObject` on the bucket ARN. Attach a policy with
  `Resource: arn:aws:s3:::ridemax-media-prod/*`.
- `The bucket you tried to delete is not empty` (on rollback) → run
  `aws s3 rm s3://ridemax-media-prod --recursive` first.

---

## Phase 3 — Build and push the Docker image to ECR

```bash
aws ecr create-repository --repository-name ridemax-site
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin <acct>.dkr.ecr.ap-southeast-1.amazonaws.com

docker build -t ridemax-site:$(git rev-parse --short HEAD) .
docker tag  ridemax-site:$(git rev-parse --short HEAD) \
  <acct>.dkr.ecr.ap-southeast-1.amazonaws.com/ridemax-site:latest
docker push <acct>.dkr.ecr.ap-southeast-1.amazonaws.com/ridemax-site:latest
```

**Likely errors**
- `denied: Your authorization token has expired` → re-run the
  `get-login-password | docker login` step (tokens expire after 12h).
- `no space left on device` during build → `docker system prune -af` and
  rebuild. Sharp's native binaries are large.
- `error resolving image: standard_init_linux.go:228 ... no such file or
  directory` on first run → image was built for arm64 (Apple Silicon). Build
  with `docker buildx build --platform linux/amd64` for EC2 t3 instances.

---

## Phase 4 — EC2 Auto Scaling Group + ALB

### 4.1 Launch template

User data script (cloud-init), pulls the image and runs it:

```bash
#!/bin/bash
set -e
yum install -y docker
systemctl enable --now docker
$(aws ecr get-login --no-include-email --region ap-southeast-1)
docker pull <acct>.dkr.ecr.ap-southeast-1.amazonaws.com/ridemax-site:latest
docker run -d --restart unless-stopped \
  --name ridemax-site \
  -p 3000:3000 \
  --env-file /etc/ridemax/site.env \
  <acct>.dkr.ecr.ap-southeast-1.amazonaws.com/ridemax-site:latest
```

The `/etc/ridemax/site.env` file is dropped by SSM Parameter Store via a
second cloud-init step (or AWS Systems Manager Run Command on first boot).
The contents:

```
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://teamridemax.com
DATABASE_URL=postgres://ridemax_admin:<pass>@<rds-endpoint>:5432/postgres
RIDEMAX_ADMIN_PASSWORD=<strong>
ADMIN_PATH_SLUG=<random-32-char-slug>     # hides /admin
RIDEMAX_MEDIA_BUCKET=ridemax-media-prod
RIDEMAX_MEDIA_PUBLIC_BASE_URL=https://media.teamridemax.com
AWS_REGION=ap-southeast-1
RIDEMAX_PRODUCTS_API_URL=                  # set when external catalog ships
RIDEMAX_PRODUCTS_API_KEY=
```

### 4.2 ALB

- Listener: HTTPS:443 with the regional ACM cert (separate from the
  CloudFront cert in us-east-1).
- Target group: HTTP:3000, health check path `/api/health`.
- Stickiness: app-cookie based, 1h, so admin sessions survive scale events.

### 4.3 ASG

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name ridemax-site-asg \
  --launch-template "LaunchTemplateName=ridemax-site,Version=\$Latest" \
  --min-size 2 --max-size 6 --desired-capacity 2 \
  --target-group-arns <alb-target-group-arn> \
  --vpc-zone-identifier <subnet-a>,<subnet-b> \
  --health-check-type ELB --health-check-grace-period 90
```

**Likely errors**
- Health checks fail with 502 → Next.js boot is slower than `--health-check-grace-period`.
  Bump to `120`. The `/api/health` route in this repo returns within a few ms
  but the Node cold start dominates.
- ASG keeps replacing instances → check CloudWatch logs from the EC2 instance
  (`/aws/ec2/...`). Most often `DATABASE_URL` is wrong and the container
  crash-loops.

---

## Phase 5 — CloudFront + WAF

### 5.1 WAF Web ACL

```bash
aws wafv2 create-web-acl \
  --name ridemax-prod \
  --scope CLOUDFRONT --region us-east-1 \
  --default-action Allow={} \
  --visibility-config "SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=ridemax-prod" \
  --rules file://waf-rules.json
```

`waf-rules.json` should include at minimum:
- `AWSManagedRulesCommonRuleSet` (CRS).
- `AWSManagedRulesAmazonIpReputationList`.
- A custom `RateBasedStatement` capping per-IP requests at 1000 / 5 min.

### 5.2 CloudFront distribution

- Origin: the ALB DNS name, HTTPS-only.
- Behaviors:
  - `/api/upload`, `/api/admin/*`, `/api/contact` → forward all cookies, no
    cache, all methods. These mutate state.
  - `/api/*` (rest) → forward `Accept`, `Authorization`, no cache.
  - `/_next/static/*`, `/_next/image/*`, `/favicon.ico` → cache 1 year,
    forward no headers.
  - default `*` → cache 5 min, forward `Cookie` header (so the admin
    middleware sees the `ridemax_admin` cookie).
- Viewer protocol: redirect HTTP → HTTPS.
- Custom error response: 404 + 403 → `/_ridemax_404`, TTL 30 s (matches the
  hidden-admin-slug behavior in `middleware.ts`).
- Web ACL: attach the one from 5.1.

### 5.3 DNS cutover

`teamridemax.com` and `www.teamridemax.com` Route 53 records → ALIAS to the
CloudFront distribution. Keep the Vercel record for an hour as a fallback.

**Likely errors**
- `The distribution does not have a valid certificate` → ACM cert not in
  us-east-1, or still in `PENDING_VALIDATION`. Re-issue in us-east-1.
- 403 from CloudFront on every page → WAF rule is matching legitimate
  traffic. Check WAF sampled requests in the console; a common culprit is
  the `SizeRestrictions_BODY` rule blocking media uploads >8 KB. Override
  that rule action to `Count` and add a higher-priority `Allow` for the
  admin paths.

---

## Phase 6 — Application changes (none required for the migration itself)

The app already routes media uploads to S3 when `RIDEMAX_MEDIA_BUCKET` and
`AWS_REGION` are set, and to Supabase Storage otherwise. Setting the AWS env
vars on EC2 is the entire switch.

If/when you wire up the external products API, set
`RIDEMAX_PRODUCTS_API_URL` + `RIDEMAX_PRODUCTS_API_KEY`. Until then, the
catalog reads from `data/catalog-products.json` baked into the image.

---

## Phase 7 — Cutover and rollback

### Cutover

1. Lower TTL on the apex A/AAAA records to 60 s 24 h before cutover.
2. During a quiet window, point Route 53 at CloudFront.
3. Watch CloudWatch → ALB target group health for 15 minutes.
4. Smoke test `/`, `/products`, `/admin` (via the secret slug),
   `/api/health`, image upload.

### Rollback

1. Re-point Route 53 to the Vercel CNAME.
2. Re-enable the Supabase project (do not delete it for at least 14 days
   post-cutover).
3. Investigate post-mortem from CloudWatch logs without time pressure.

---

## Phase 8 — Cost guardrails

| Service | Configuration | ~Monthly |
|---|---|---|
| EC2 (2× t3.small, on-demand) | Always-on | $30 |
| ALB | 1 LCU avg | $20 |
| RDS db.t3.micro Multi-AZ | 20 GB SSD | $30 |
| S3 + CloudFront | 50 GB egress | $5 |
| WAF + managed rule groups | 1 ACL, 4 rules | $10 |
| Route 53 hosted zone | 1 zone | $0.50 |
| Total baseline | | ~$95 |

Reserved Instances bring EC2 + RDS down ~30 % once the load profile is known.

---

## Phase 9 — Post-cutover hardening

- [ ] Rotate `RIDEMAX_ADMIN_PASSWORD` and the SSM parameter holding `DATABASE_URL`.
- [ ] Set `ADMIN_PATH_SLUG` to a fresh random string (keeps the panel
      undiscoverable even if the previous slug leaked in old screenshots).
- [ ] Enable RDS automated backups → 14-day retention.
- [ ] CloudWatch alarms: ALB 5xx rate, RDS CPU > 80 %, WAF blocked > 10 k / hr.
- [ ] Decommission Vercel project (after a 14-day soak).
- [ ] Decommission Supabase project (after RDS is the source of truth and
      backups have been verified by a restore test).

---

## Error catalog cheat sheet

The five failures we have seen most often during practice runs:

1. **ENOENT mkdir `/var/task/data/media`** — happened on Vercel before the
   storage backend was made pluggable. Fixed in
   `lib/server/media-library.ts` by selecting Supabase Storage when S3 isn't
   configured. After this migration the path is S3 directly.
2. **502 from ALB on every request** — Next.js bound to `localhost` instead
   of `0.0.0.0`. Make sure the Dockerfile starts with `next start -H 0.0.0.0`.
3. **403 from CloudFront for `/api/admin/login`** — WAF body-size rule
   tripped. Override to `Count`.
4. **`SSL connection has been closed unexpectedly` from RDS** — the Node
   driver timed out in the connection pool. Add `?sslmode=require&pool_timeout=30`
   to `DATABASE_URL`.
5. **Admin sidebar / panel returns 404 in production** — `ADMIN_PATH_SLUG`
   is set but the operator forgot the new URL. The slug is the only entry
   point; if lost, set it to empty in SSM, redeploy, retrieve, then rotate.
