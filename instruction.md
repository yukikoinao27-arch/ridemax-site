# Team Ridemax Handoff Instructions

This file is the lightweight handoff playbook for moving from solo speed to safe team delivery. Keep Trello for tasks; keep durable technical decisions in this repo.

## 1. GitHub Workflow

Use short-lived branches even when working alone:

```powershell
git checkout main
git pull
git checkout -b feat/admin-page-builder-tabs
```

```
git checkout main
git pull
git checkout -b feat/something

# work

git add .
git commit
git push

# THEN create PR

```

Commit focused changes:

```powershell
npm run lint
npm run build
git status
git add .
git commit -m "feat(admin): improve page builder tabs"
git push -u origin feat/admin-page-builder-tabs
```

Open a pull request and fill in `.github/pull_request_template.md`. Add screenshots for UI work and note any database or Vercel environment changes.

Recommended branch protection for `main`:

- Require pull requests before merging.
- Require the CI workflow to pass.
- Block force pushes.
- Require one approval once another developer joins.

## 2. Supabase Workflow

Do not make permanent schema changes only in the Supabase dashboard. Every schema change needs a repo change.

Current baseline:

- `supabase/schema.sql` is the idempotent schema snapshot.
- `site_content_documents` is the shared CMS bundle table.
- `site_content_revisions` records publishes.
- `admin_activity_log` records admin actions.

For content bundle portability:

```powershell
npm run cms:seed -- data/site-content.json
npm run cms:export
```

Use `cms:seed` when bootstrapping a new Supabase project from a JSON bundle. Use `cms:export` before risky migrations, demos, or handoffs.

When the team adopts Supabase CLI migrations, use this pattern:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase migration new describe_change_here
supabase db push
```

Keep development, preview, and production databases clearly separated. If that is too much at first, use one production Supabase project and one development Supabase project, never a mixed manual setup.

## 3. Vercel Workflow

Use `main` for production. Use branches and pull requests for preview deployments.

Environment variable habits:

- Production secrets belong only in Vercel Production.
- Preview-safe secrets belong in Vercel Preview.
- Local-only values belong in `.env.local`.
- Document new variables in the PR and README before merging.

Before merging a PR, check the Vercel preview URL for the changed public page and the changed admin flow.

## 4. Documentation Workflow

Use ADRs for durable design decisions. Copy `docs/adr/0000-template.md` for each major decision.

Good ADR topics for this app:

- Why Supabase stores CMS content.
- Why public product data is marketing-only and excludes stock/price.
- Why card styles are presets instead of arbitrary layout controls.
- Why admin audit logs are stored in Supabase.
- Why Vercel previews map to feature branches.

Use Trello for "what are we doing next." Use this repo for "how does the system work."

## 5. DBeaver And Supabase

You can open the Supabase Postgres database in DBeaver with the Postgres driver.

Recommended steps:

1. Open Supabase Dashboard.
2. Go to Project Settings, then Database.
3. Copy the connection details or connection string.
4. In DBeaver, create a new PostgreSQL connection.
5. Use the Supabase host, port, database, user, and password from the dashboard.
6. Test the connection before saving.

If your network cannot connect to the direct database port, use Supabase's pooler connection details instead. Keep the database password in a password manager, not in Trello, screenshots, or committed files.

## 6. Review Checklist

Before pushing or opening a PR:

```powershell
git status
npm run lint
npm run build
```

For admin CMS changes:

- Save Draft works.
- Publish works.
- Preview / Exit Preview are not shown at the same time in conflicting places.
- The public page reflects the published content.
- The relevant Supabase migration/schema change is included.

For UI changes:

- Check desktop.
- Check mobile.
- Add screenshots to the PR.
