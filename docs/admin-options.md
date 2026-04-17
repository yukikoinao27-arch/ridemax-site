# Ridemax admin, storage, and search notes

## Recommended admin path
Use the custom Next.js admin as the primary editor.
It now exposes the shared page copy, navigation, contact settings, careers story blocks, events, news, awards, and the main catalog collections from the same content contract used by the public site.

## Recommended storage behavior
Server-side Supabase mode should only activate when both of these are configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If either value is missing, the app intentionally falls back to the version-controlled local JSON bundle.
This prevents half-configured deployments from rendering an empty schema instead of the seeded marketing content.

## Supported environment variables
Set these in Vercel or your server environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SECRET_KEY` as an alias when needed
- `RIDEMAX_ADMIN_PASSWORD`
- `ADMIN_PATH_SLUG` (optional, strongly recommended in production)
- `NEXT_PUBLIC_SITE_URL`

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is still fine for future browser-side Supabase features, but the server content repository should not use it for trusted reads or writes.

## Hidden admin URL (WordPress-style)
Set `ADMIN_PATH_SLUG` to a long random string (for example `x7a2-panel-q91k`) and the middleware at `middleware.ts` will:
- Rewrite `/{ADMIN_PATH_SLUG}` internally to `/admin` so the login form still renders, and
- Return a 404 for `/admin` and `/admin/*` whenever the request does not already carry the signed-in `ridemax_admin` cookie.

This keeps the admin surface undiscoverable through URL probes. After a successful login the HttpOnly `ridemax_admin` cookie is present, and the browser can continue to use internal `/admin/*` navigation without going back through the slug. Rotate the slug by updating the environment variable and redeploying; there is no database record to migrate.

Leave `ADMIN_PATH_SLUG` empty in local development to keep `/admin` reachable the usual way. The middleware is a no-op when the variable is unset.

## Database direction
Use normalized Supabase tables first.
That matches the Wix-like collections model while keeping AGENTS.md goals intact:
- one clear source of truth
- hidden storage complexity behind the repository layer
- simpler public page code
- easier long-term reporting and admin growth

## Search behavior
The public search should continue to use the shared content bundle and published-only records.
That keeps drafts private while letting product, event, award, career, and page content stay searchable from one route.

## Contact flow
The About Us contact form writes to `contact_messages` in Supabase when server-side credentials are present.
Without those credentials, local development falls back to `data/contact-messages.json`.
