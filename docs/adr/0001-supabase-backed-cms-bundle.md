# Use Supabase As The Shared CMS Source

## Status

Accepted

## Context

The app started with `data/site-content.json` as a practical seed and fallback. That works for a solo developer, but it breaks down when marketing edits content in production and developers need local, preview, and production environments to see the same published bundle.

## Decision

Use Supabase `site_content_documents` as the shared runtime CMS source for draft and published content. Keep local JSON as a bootstrap/fallback artifact until production, preview, and local development all use the seed/export workflow consistently.

## Consequences

Marketing edits can be shared across deployments once each environment points at the intended Supabase project. The repo still keeps seed data for safe local bootstrapping. The team must run migrations and use `npm run cms:seed` / `npm run cms:export` instead of manually editing production data without a restore path.
