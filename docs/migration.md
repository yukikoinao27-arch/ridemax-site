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

Read this alongside [`docs/architecture.md`](./architecture.md). The architecture doc
explains *why* the target shape looks the way it does; this playbook covers *how* to
stand it up.



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

## Phase 0.5 — VPC network design

Create a fresh VPC for the marketing site; do **not** share with other workloads. The
public subnets host the ALB, the private subnets host EC2, and the data subnets host RDS.
Keeping data subnets isolated means the database is never one misconfigured security
group away from the public internet.

```
VPC  10.30.0.0/16   (one region, two AZs minimum)
├── Public  10.30.0.0/24    AZ-a  → ALB, NAT gateway
├── Public  10.30.1.0/24    AZ-b  → ALB, NAT gateway (HA)
├── Private 10.30.10.0/24   AZ-a  → EC2 ASG
├── Private 10.30.11.0/24   AZ-b  → EC2 ASG
├── Data    10.30.20.0/24   AZ-a  → RDS primary
└── Data    10.30.21.0/24   AZ-b  → RDS standby (Multi-AZ)
```

### Security groups (minimum viable, principle of least privilege)

| SG                 | Ingress                                     | Egress                          |
| ------------------ | ------------------------------------------- | ------------------------------- |
| `sg-alb`           | 443 from `0.0.0.0/0`                        | 3000 to `sg-ec2`                |
| `sg-ec2`           | 3000 from `sg-alb`                          | 443 to `0.0.0.0/0` (NAT), 5432 to `sg-rds` |
| `sg-rds`           | 5432 from `sg-ec2`                          | none                            |
| `sg-ssm-endpoints` | 443 from `sg-ec2`                           | 443 to VPC CIDR                 |

No SSH from the internet. Shell access is exclusively through **SSM Session Manager**
(`aws ssm start-session --target i-...`), which leaves an audit trail in CloudWatch and
does not require opening port 22.

### VPC endpoints (saves NAT gateway cost, tightens blast radius)

Attach these Gateway/Interface endpoints so common traffic never leaves the VPC:

- `com.amazonaws.<region>.s3` (Gateway) — media reads/writes.
- `com.amazonaws.<region>.ecr.api`, `...ecr.dkr` (Interface) — image pulls.
- `com.amazonaws.<region>.ssm`, `...ssmmessages`, `...ec2messages` (Interface) — SSM.
- `com.amazonaws.<region>.secretsmanager` (Interface) — secret fetches.
- `com.amazonaws.<region>.logs` (Interface) — CloudWatch Logs.

**Likely errors**
- `i-... could not connect to SSM` → endpoints missing. Add the three SSM interface
  endpoints and attach `sg-ssm-endpoints` to them.
- NAT gateway bill explodes → S3 endpoint missing; every image read was routed through
  NAT. Adding the Gateway endpoint costs $0 and fixes it.

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

For stricter parity (column-level drift, not just row counts) hash the data:

```bash
psql "$SRC" -c "\copy (select md5(string_agg(t::text, ',' order by id)) from public.brands t) to stdout"
psql "$DST" -c "\copy (select md5(string_agg(t::text, ',' order by id)) from public.brands t) to stdout"
```

Run this per table before cutover. Any mismatch is a signal that the dump ran
against an older snapshot than the cutover window expects.

### 1.5 Tuning and observability

Enable `pg_stat_statements` so slow queries are visible in CloudWatch from day one:

```bash
aws rds modify-db-parameter-group \
  --db-parameter-group-name ridemax-prod-pg16 \
  --parameters "ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot"

aws rds reboot-db-instance --db-instance-identifier ridemax-prod

psql ... -c "create extension if not exists pg_stat_statements;"
```

Then enable **Performance Insights** (free tier: 7 days retention) and **enhanced
monitoring** (1-minute interval) on the RDS instance. The slow-query top-10 is the
first place to look whenever the admin feels sluggish.

### 1.6 Backups, PITR, and restore rehearsal

- `backup-retention-period=14` for production (the default `7` is too tight for a
  Monday-morning "we broke it on Friday" recovery).
- PITR is enabled automatically when retention is ≥1; rehearse it:
  ```bash
  aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier ridemax-prod \
    --target-db-instance-identifier ridemax-pitr-test \
    --restore-time "$(date -u -d '-1 hour' +%FT%TZ)"
  ```
  Run this at least once *before* going live, confirm you can connect and query, then
  delete the clone.
- Nightly `pg_dump` to S3 with lifecycle rules (30 days standard, 180 days Glacier
  Deep Archive) is cheap insurance against RDS snapshot loss.

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

## Phase 6 — Application changes and catalog ingestion

### 6.1 Runtime env var audit

The app selects its media, database, and catalog backends from env vars at boot, so
the *only* code-side change during the migration is the contents of `site.env`.
Validate the table below against the running instance before cutting DNS:

| Variable                        | Dev value                     | Production value                              |
| ------------------------------- | ----------------------------- | --------------------------------------------- |
| `NODE_ENV`                      | `development`                 | `production`                                  |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000`       | `https://teamridemax.com`                     |
| `DATABASE_URL`                  | Supabase pooler URL           | RDS IAM-auth URL (see §6.2)                   |
| `NEXT_PUBLIC_SUPABASE_URL`      | set                           | **unset** (forces Supabase client off)        |
| `SUPABASE_SERVICE_ROLE_KEY`     | set                           | **unset**                                     |
| `RIDEMAX_MEDIA_BUCKET`          | unset                         | `ridemax-media-prod`                          |
| `RIDEMAX_MEDIA_PUBLIC_BASE_URL` | unset                         | `https://media.teamridemax.com`               |
| `AWS_REGION`                    | unset                         | `ap-southeast-1`                              |
| `RIDEMAX_UPLOAD_MAX_MB`         | `2`                           | `8` (phone camera headroom for marketing)     |
| `ADMIN_PATH_SLUG`               | unset                         | 32-char random string                         |
| `ADMIN_COOKIE_SECRET`           | dev secret                    | Secrets Manager-managed, rotated quarterly    |
| `RIDEMAX_ADMIN_PASSWORD`        | dev password                  | Secrets Manager-managed                       |
| `RIDEMAX_PRODUCTS_API_URL`      | unset (falls back to JSON)    | Warehouse API endpoint (see §6.3)             |
| `RIDEMAX_PRODUCTS_API_KEY`      | unset                         | Warehouse-issued API key (Secrets Manager)    |

### 6.2 RDS connection string

Prefer **IAM authentication** for the app's RDS connection — it eliminates static
DB passwords from the env:

```
DATABASE_URL=postgres://ridemax_app@<endpoint>:5432/postgres?sslmode=verify-full
RIDEMAX_DB_IAM_AUTH=1
```

With `RIDEMAX_DB_IAM_AUTH=1` the container obtains a short-lived token via
`aws rds generate-db-auth-token` at connection time. If IAM auth is not yet wired,
store the password in Secrets Manager (not SSM SecureString — Secrets Manager rotates
automatically) and load it at container boot.

### 6.3 Third-party catalog ingestion

The warehouse API is a **read-only seam**. Three shapes, pick one based on latency and
warehouse-team ops posture (full analysis in `docs/architecture.md`):

**Option A — Pull over HTTPS (default).** Simplest, cheapest.
```
RIDEMAX_PRODUCTS_API_URL=https://warehouse.internal.ridemax.ph/v1/catalog
RIDEMAX_PRODUCTS_API_KEY=<issued-by-warehouse-team>
```
Set `Cache-Control` at the CDN to `public, s-maxage=60, stale-while-revalidate=300` so
a warehouse outage shows the last-known-good catalog for five minutes instead of 500s.

**Option B — S3 snapshot feed.** Choose when the warehouse API cannot sustain public-
traffic QPS.
- Warehouse writes `s3://warehouse-catalog-feed/catalog.json.gz` every 5 minutes.
- Cross-account bucket policy grants the Ridemax role read-only access.
- EventBridge rule fires a Lambda on `PutObject`; Lambda hits an SSM Run Command on
  the EC2 fleet to refresh the in-process cache.

**Option C — CDC replica (Debezium/DMS).** Highest fidelity, highest ops cost.
- Warehouse publishes CDC to Kinesis; AWS DMS writes to a Ridemax-owned read-replica
  RDS instance with a `catalog_products_readonly` role.
- The Next.js app queries the replica; the admin UI has no write path, enforced both
  by IAM role scope and by the absence of CMS fields.

Whichever option ships, the invariant in code is unchanged: `getProductCatalog()` in
`lib/server/ridemax-content-repository.ts` returns the catalog in one shape, and no
other module cares where the bytes came from.

### 6.4 Security-group rules for outbound API calls

EC2 needs egress to the warehouse API. Two safer patterns than "allow 0.0.0.0/0":

- **AWS PrivateLink** if the warehouse runs in a sibling AWS account. Creates a
  private endpoint in this VPC; traffic never touches the public internet.
- **Egress-filtered NAT** via AWS Network Firewall, allowing only the warehouse
  hostname. Blocks data exfiltration if the app is ever compromised.

---

## Phase 6.5 — CI/CD pipeline

GitHub Actions on `main` → build a Docker image → push to ECR → trigger an ASG
instance refresh. The workflow lives in `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # for GitHub → AWS OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<acct>:role/github-actions-ridemax
          aws-region: ap-southeast-1
      - uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push
        run: |
          IMAGE=<acct>.dkr.ecr.ap-southeast-1.amazonaws.com/ridemax-site
          docker buildx build --platform linux/amd64 \
            -t $IMAGE:${{ github.sha }} \
            -t $IMAGE:latest --push .
      - name: Roll the ASG
        run: |
          aws autoscaling start-instance-refresh \
            --auto-scaling-group-name ridemax-site-asg \
            --preferences MinHealthyPercentage=80,InstanceWarmup=120
```

Use **GitHub → AWS OIDC** (not long-lived access keys). The IAM role trust policy
scopes access to `repo:ridemax/site:ref:refs/heads/main`.

**Likely errors**
- `Not authorized to perform: sts:AssumeRoleWithWebIdentity` → OIDC provider missing
  in IAM. Run the `aws iam create-open-id-connect-provider` one-liner for
  `token.actions.githubusercontent.com`.
- ASG refresh hangs → health-check grace period too short. Bump launch-template
  `HealthCheckGracePeriod` to 180.

### Rollback

```bash
# Re-tag the previous image as :latest and roll.
aws ecr batch-get-image --repository-name ridemax-site \
  --image-ids imageTag=<last-good-sha> \
  --query 'images[].imageManifest' --output text \
| aws ecr put-image --repository-name ridemax-site --image-tag latest \
    --image-manifest file:///dev/stdin

aws autoscaling start-instance-refresh --auto-scaling-group-name ridemax-site-asg
```

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

## Phase 9 — Observability, hardening, and DR

Post-cutover is when the platform earns or loses trust. Walk each subsection top-down;
do not skip DR rehearsal — a backup that has never been restored is not a backup.

### 9.1 Logging

- **CloudWatch Agent on EC2** ships `/var/log/messages`, `/var/log/cloud-init.log`, and
  the Docker container stdout to CloudWatch Logs. Log group:
  `/ridemax/site/app`, retention `30 days`.
- **Structured logs**. The Next.js app emits one JSON object per request (method, path,
  status, latency_ms, admin_session_id if present). Use a CloudWatch Logs metric filter
  to graph `latency_ms > 1000` and `status >= 500`.
- **ALB access logs** → S3 bucket `ridemax-alb-logs-prod` with a 90-day lifecycle rule.
  CloudFront access logs → separate bucket, same retention.
- **RDS logs** → enable `postgresql` log export to CloudWatch. Slow-query threshold:
  `log_min_duration_statement = 500` ms.

### 9.2 Metrics and alerts

The minimum viable alerting set. Every alarm routes to an SNS topic that pages on-call
via email + SMS.

| Alarm                                    | Threshold                           | Why                                     |
| ---------------------------------------- | ----------------------------------- | --------------------------------------- |
| ALB `HTTPCode_Target_5XX_Count`          | > 10 in 5 min                       | Detect broken release.                  |
| ALB `TargetResponseTime` p99             | > 2 s for 10 min                    | Slow origin or DB.                      |
| ALB `UnHealthyHostCount`                 | > 0 for 3 min                       | EC2 is crashing.                        |
| EC2 `CPUUtilization` avg                 | > 80 % for 10 min                   | Undersized fleet.                       |
| EC2 per-instance `StatusCheckFailed`     | > 0 for 5 min                       | Hardware / boot failure.                |
| RDS `CPUUtilization`                     | > 80 % for 10 min                   | Slow query or hot key.                  |
| RDS `FreeStorageSpace`                   | < 5 GB                              | Will page long before disk fills.       |
| RDS `DatabaseConnections`                | > 80 % of `max_connections`         | Connection leak.                        |
| WAF `BlockedRequests`                    | > 10 000 / hr                       | Either a real DDoS or a bad rule.       |
| Synthetics canary `/api/health`          | fail twice in a row                 | End-to-end path is broken.              |
| Synthetics canary `/`                    | fail twice in a row                 | Front-end is down.                      |
| S3 4xx/5xx                               | > 50 / 5 min                        | Broken CloudFront origin config.        |

### 9.3 Security hardening

- [ ] Rotate `RIDEMAX_ADMIN_PASSWORD`, `ADMIN_COOKIE_SECRET`, and the RDS password to
      fresh random values. Store in **Secrets Manager** with automatic rotation enabled.
- [ ] Set `ADMIN_PATH_SLUG` to a fresh 32-char random string.
- [ ] IAM policy audit: confirm the EC2 instance role has **only** `s3:GetObject`/
      `s3:PutObject` on `ridemax-media-prod/*`, `rds-db:connect` on the DB ARN,
      `secretsmanager:GetSecretValue` on this app's secrets, and nothing else.
- [ ] Disable EC2 instance metadata v1 (`HttpTokens=required`) on the launch template
      so IMDSv2 is mandatory. This closes the classic SSRF → credential-theft path.
- [ ] Enable **GuardDuty**, **Security Hub** (AWS Foundational Security Best Practices
      standard), and **AWS Config** (at minimum the managed rules for public-S3,
      public-RDS, unencrypted-EBS, unrestricted-SSH).
- [ ] Enable **VPC Flow Logs** to the dedicated `ridemax-flowlogs-prod` bucket with
      a 30-day lifecycle → Glacier.
- [ ] Forbid human DB access in production. Engineers connect via SSM port forwarding
      through the EC2 fleet, not via a public endpoint.

### 9.4 Backups and disaster recovery

- [ ] RDS automated backups: `backup-retention-period=14`, `BackupWindow=17:00-18:00 UTC`
      (quiet hours for PH traffic).
- [ ] Cross-region snapshot copy to `us-west-2` weekly via EventBridge → Lambda.
- [ ] S3 media bucket: enable **Versioning** and a 30-day noncurrent-version lifecycle.
      A compromised admin account that deletes files can be reversed.
- [ ] Quarterly DR drill:
      1. Restore the latest RDS snapshot into a fresh instance in the DR region.
      2. Launch a scratch ASG pointing at it.
      3. Confirm the home page, product pages, and admin all render.
      4. Record time-to-recovery in an incident log.
- [ ] Document RPO / RTO targets up front — today's design supports roughly RPO=5 min
      (PITR granularity), RTO=60 min (manual DR-region spin-up). If stakeholders need
      tighter, add a warm standby ASG in the DR region and raise the budget.

### 9.5 Decommission

- [ ] Decommission Vercel project (after a 14-day soak with no rollbacks).
- [ ] Decommission Supabase project (after RDS is the source of truth, a PITR drill
      has succeeded, and the last nightly `pg_dump` has landed in S3).
- [ ] Remove Vercel-only env vars from any shared secret stores.

---

## Phase 10 — Load & failover testing

Do these at least once in staging against a production-shaped stack before the real
cutover.

### 10.1 Load test

```bash
k6 run --vus 100 --duration 5m loadtest/home-and-products.js
```

Targets the homepage, a category page, a product detail, and `/api/search` in a mix
that matches real traffic (80 % home + category, 15 % PDP, 5 % search). Pass criteria:

- p95 latency < 800 ms.
- Zero 5xx.
- RDS CPU stays below 60 % (headroom for a real burst).
- CloudFront cache-hit ratio > 85 %.

### 10.2 Chaos / failover drills

- **Kill an EC2.** `aws ec2 terminate-instances ...`. ALB should drain and the ASG
  should replace it within 3 minutes. Real user traffic should see no 5xx.
- **Force RDS failover.** `aws rds reboot-db-instance --force-failover`. App should
  reconnect within 60 s. Grep the app logs for the expected reconnection line.
- **Simulate a warehouse API outage.** Block the hostname at the security group
  level. Catalog-dependent pages should serve the last-known-good snapshot from the
  Next cache for ≥5 minutes before degrading.
- **Rotate the DB password live.** Secrets Manager triggers a rotation Lambda; the
  app should reload credentials without a restart (connection pool drains over ~60 s).

---

## Phase 11 — Compliance and data retention

The contact-message inbox and the chat-upload log contain PII (name, email, free text,
IP, user agent). Under PH Data Privacy Act, retain only as long as needed.

- `contact_messages`: 12-month auto-purge via a nightly Lambda:
  ```sql
  delete from public.contact_messages where created_at < now() - interval '12 months';
  ```
- `chat_uploads`: 90-day auto-purge (the rows are an audit log, not content).
- `media_assets` has no PII, but keep the audit of who uploaded what via CloudTrail S3
  data events.
- CloudFront access logs and VPC Flow Logs → 90-day lifecycle to Glacier, 365-day
  deletion.
- Publish a privacy notice that matches this retention schedule; store the canonical
  version in the CMS as a `richText` block under `/privacy`.

---

## Phase 12 — Post-cutover checklist

Final pass before declaring "migration complete" and archiving this playbook:

- [ ] Production checklist from Phase 9 all green.
- [ ] DR drill passed in the DR region (not just the primary).
- [ ] Runbook in `docs/runbooks/` for: pager alerts, admin lockout recovery, media
      bucket corruption, warehouse API outage, DB password rotation.
- [ ] Ops on-call rotation documented with first responder + escalation.
- [ ] Cost dashboard built in AWS Cost Explorer, grouped by tag `Project=ridemax`.
- [ ] Budget alarm at 120 % of the Phase 8 baseline, SNS → ops@teamridemax.

---

## Appendix A — Minute-by-minute cutover runbook

The playbook above describes the build; this appendix describes the 90-minute DNS
cutover window itself. Assume two people: a driver (hands on keyboard) and a
verifier (reads the logs, calls stop).

| T-min | Action                                                                              | Verify                                            |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| −24 h | Lower Route 53 TTL on apex + `www` to 60 s                                          | `dig +short teamridemax.com` shows new TTL        |
| −24 h | Pre-warm CloudFront with a `curl` pass over the sitemap                             | `X-Cache: Hit from CloudFront` on repeat requests |
| −60   | Freeze content changes; broadcast "no CMS edits" in Slack                           | Admin activity log idle                           |
| −45   | Snapshot Supabase one final time; copy latest media to S3                           | Dump lands in backup bucket; `aws s3 sync` clean  |
| −30   | Take final `md5` hash per table (§1.4); compare source vs. dest                     | All hashes match                                  |
| −15   | Put the app in read-only mode (`RIDEMAX_CMS_READONLY=1`) on Vercel                  | Admin write attempts show a maintenance banner    |
| −10   | Swap DB dump one more time into RDS (`psql --single-transaction -f data-only.sql`)  | Row counts match                                  |
|  −5   | Start EC2 ASG `start-instance-refresh`, wait for 100 % healthy                      | ALB target group all healthy                      |
|   0   | Flip Route 53: `aws route53 change-resource-record-sets ... ALIAS → CloudFront`     | `dig` from two regions returns the new target     |
|  +2   | Hit `/api/health` via public DNS                                                    | 200, `{ ok: true, database: "ok" }`               |
|  +5   | Smoke: `/`, `/products/tires`, `/admin` (via slug), image upload, contact form     | All 200, admin cookie persists, upload lands in S3|
| +10   | Watch CloudWatch: 5xx count, TargetResponseTime p99, RDS CPU                        | No anomalies                                      |
| +30   | Lift read-only mode (`RIDEMAX_CMS_READONLY=` empty)                                 | Admin edits save                                  |
| +60   | Raise TTL back to 300 s                                                             | `dig +short` confirms                             |
| +90   | Stand down. Write up timeline, close incident channel.                              | All alarms green                                  |

### Abort criteria

Any one of these during the window triggers rollback (Phase 7):

- 5xx rate > 5 % for 2 consecutive minutes.
- `/api/health` returns 500.
- Admin login fails from two independent networks.
- Upload returns 500 with a storage-related error (ENOENT, AccessDenied, AuthFailure).
- RDS CPU > 95 % (hot-query storm we didn't see in staging).

### Rollback drill

Rollback was last rehearsed against a staging stack on `TODO: <date>`. If that date
is older than 60 days, re-rehearse before the next production cutover.

---

## Appendix B — Maintenance mode

CloudFront can serve a static maintenance page directly, with no origin dependency.
Keep `s3://ridemax-static/maintenance/index.html` always provisioned; when needed:

```bash
aws cloudfront update-distribution ... \
  --distribution-config file://cloudfront-config-maintenance.json
```

The maintenance config overrides the default origin to the static S3 bucket and
returns HTTP 503 with a `Retry-After: 300` header. Revert by re-applying the normal
distribution config.

This beats "toggle a flag in the app" because the origin can be fully offline for
maintenance windows (major RDS version upgrade, for example) without users seeing
CloudFront errors.

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
