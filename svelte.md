# SvelteKit frontend migration notes

## Current state

The new frontend scaffold lives in `apps/web`. It follows the `todo-idle-quest` pattern: SvelteKit owns UI and Better Auth, while Phoenix should become the browser-facing API through Better Auth JWTs.

This is not a complete UI parity port yet. The shell, auth pages, route guard structure, API client, route surface, and Phoenix JWT foundation are in place. Several high-traffic routes now use Svelte UI against Phoenix APIs directly:

- Workspace shell: Svelte navigation now includes mobile drawer behavior, account/admin/subscription actions, organization switching, feature-flagged nav entries, and active organization propagation to Phoenix through `X-Organization-Id`.
- `/anuncios`: collection/listing CRUD, active collection persistence, favorites, sharing toggle, table/card/map display modes, browser geocoding with cached OpenStreetMap embeds, image thumbnails/lightbox, manual listing entry/edit/delete, collection copy, title sync, JSON import/export, AI import from text/URL/image/PDF, duplicate review modal with add-anyway flow, reparse/quick-reparse review flows, and image-ingestion trigger.
- `/analise`: collection/listing selector, listing dossier with image gallery, nearby data, latest analysis load, start analysis, polling, step retry, per-card x-ray retry, and richer v6 result/ambiente sections.
- `/comparacao`: collection/listing selectors, persisted comparison slots, visible-slot controls, fixed-cell recalculation, matrix view, listing image/link/map/analysis actions, and comparison notes.
- `/explorar`: portal-search CRUD/run polling, authenticated Phoenix SSE stream with polling fallback, chip-based filter builder, saved-link `fromLink` seeding, portal URL previews, interactive matrix with cell drill-down, portal/bairro summaries, target status, cost summary, and result table through Phoenix JWT APIs.
- `/links`, `/contatos`, `/regioes`, `/condominios`, `/visao-geral`: workspace CRUD backed by Phoenix JWT APIs.
- `/conectar-whatsapp` and `/conectar-telegram`: pending-code handling, login redirect, status, and linking through Phoenix JWT APIs.
- `/organizacoes`: organization creation/selection, member listing, member role updates/removal, active organization context for subsequent Phoenix JWT API calls, and active-organization addon management.
- `/admin`: system stats, user search, admin toggle, user rename/delete, manual subscription grants, subscription history/status edits/cancel-reactivate requests, plan Stripe Price ID mapping, Stripe reconciliation, user addon grants, and organization addon grants through Phoenix JWT APIs.
- `/admin/feature-flags`: local admin feature flags ported to Svelte/localStorage, matching the previous browser-local behavior.
- `/subscribe`: current subscription, available plans, personal/org addon list, Phoenix-backed Stripe Checkout session creation, and Phoenix-backed Stripe billing portal opening.
- `/floodrisk`: addon-gated direct Three.js Svelte scene with scenario switching, animated water level, block height configuration, custom JSON import, and connection type toggles.
- `/financiamento`: SAC simulator with extra amortization, resources/reserve inputs, current-property haircut, scenario matrix for permuta vs venda posterior, and formula breakdown cards.
- `/casa`: redirects to `/financiamento`, preserving current Next behavior.
- `/share/[token]`: public shared collection table backed by Phoenix, including public shared image thumbnails for hosted listing images.
- `/s/[shortId]`: short-link redirect resolution backed by Phoenix.
- `/planos`, `/privacy`, `/terms`, `/data-deletion`: static content ported.

## Start the Svelte frontend

From the repository root:

```bash
pnpm install
pnpm dev:web
```

The Svelte dev server runs on Vite's default port, usually `http://localhost:5173`.

Useful commands:

```bash
pnpm check:web
pnpm --dir apps/web test
```

Do not run `pnpm build:web` unless explicitly needed; the repo instruction says not to run frontend builds unless asked.

## Required environment

Copy [`apps/web/.env.example`](apps/web/.env.example) to `apps/web/.env` (SvelteKit loads env from `apps/web`, not the repo root):

```bash
cp apps/web/.env.example apps/web/.env
# Fill GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET from your Google OAuth client.
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App Postgres on host port **5435** (see `infra/local/.env.local.example`) |
| `DATABASE_SSL` | `false` locally |
| `DATABASE_POOL_MAX` | pg pool size for Better Auth + `/api/subscriptions` |
| `BETTER_AUTH_SECRET` | Same value as Next while both frontends run |
| `BETTER_AUTH_URL` | Must match browser origin, e.g. `http://localhost:5173` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated origins (Svelte + Next during migration) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth; add redirect `http://localhost:5173/auth/callback/google` |
| `PUBLIC_API_URL` | Phoenix, e.g. `http://localhost:4000` |
| `PUBLIC_GOOGLE_MAPS_API_KEY` | Maps (optional until map UI is ported) |

Phoenix (`infra/local/.env.local` or compose env) should also set:

```bash
BETTER_AUTH_JWKS_URL=http://host.docker.internal:5173/auth/jwks
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
APP_PUBLIC_URL=http://localhost:5173
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

**Dual frontend:** Next (`:3000`) and Svelte (`:5173`) share `DATABASE_URL` and `BETTER_AUTH_SECRET` but each process needs its own `BETTER_AUTH_URL`. Sessions are not portable across origins.

**Database:** if tables are missing, from repo root:

```bash
DATABASE_URL=postgresql://minhacasa:minhacasa_local_password@localhost:5435/minha_casa_local pnpm db:migrate
```

**Subscription gating:** after login, the app calls `GET /api/subscriptions` on the Svelte origin to set the httpOnly `subscription-status` cookie (same behavior as Next’s BFF). [`apps/web/src/lib/sync-subscription-cookie.ts`](apps/web/src/lib/sync-subscription-cookie.ts) is used from login, signup, subscribe, and anuncios.

The backend now has JWT-authenticated browser endpoints, starting with:

```text
GET /api/me
Authorization: Bearer <better-auth-jwt>
```

The Svelte API client calls **same-origin** `/api/*` in the browser (SvelteKit proxies to Phoenix on `PHOENIX_API_URL`, default `http://localhost:4000`). `/api/subscriptions` stays on SvelteKit for the subscription cookie. Requests use Better Auth JWTs. It also sends `X-Organization-Id` when the user selects an active organization in `/organizacoes`; Phoenix validates membership in `JwtAuth` before assigning `current_org_id`. Existing internal Phoenix routes are still mounted for parts not yet migrated; do not expose internal headers to browser code.

## Key files

- `apps/web/src/hooks.server.ts`: Better Auth handler, session population, auth redirects, subscription route gating.
- `apps/web/src/lib/auth.ts`: Better Auth server config with JWT plugin and Drizzle adapter (shared `lib/db` schema).
- `apps/web/src/routes/api/subscriptions/+server.ts`: sets httpOnly `subscription-status` cookie for route gating.
- `apps/web/src/lib/sync-subscription-cookie.ts`: client helper to refresh subscription cookie via SvelteKit BFF.
- `apps/web/src/lib/auth-client.ts`: Svelte Better Auth client.
- `apps/web/src/lib/stores/auth.ts`: cached JWT helper for Phoenix API calls.
- `apps/web/src/lib/organization-context.ts`: active-organization httpOnly cookie name and options.
- `apps/web/src/lib/server/organization-context.ts`: membership validation and cookie read/write on the server.
- `apps/web/src/lib/active-organization.ts`: client cache synced from layout data; `setActiveOrganizationId` posts to `/api/organization-context`.
- `apps/web/src/routes/api/organization-context/+server.ts`: GET/POST active organization cookie (auth required).
- `apps/web/src/lib/api/client.ts`: browser API client; same-origin `/api/*` with `credentials: include` (org header injected by proxy from cookie).
- `apps/web/src/lib/components/layout/WorkspaceShell.svelte`: Svelte app navigation shell with mobile drawer, account menu, organization switcher, addon/admin actions, and feature-flagged navigation.
- `apps/web/src/lib/components/workspace/OrganizationSwitcher.svelte`: Svelte organization context switcher used by shell chrome.
- `apps/web/src/lib/components/ui/Button.svelte`, `Card.svelte`, `Input.svelte`, `Badge.svelte`: first shared Svelte UI primitives.
- `backend/lib/minha_casa_ai/auth/jwks.ex`: JWKS cache/verifier for Better Auth tokens.
- `backend/lib/minha_casa_ai_web/plugs/jwt_auth.ex`: Phoenix bearer-token plug for new browser APIs.
- `backend/lib/minha_casa_ai_web/controllers/user_controller.ex`: `/api/me` smoke endpoint.
- `backend/lib/minha_casa_ai_web/controllers/collection_controller.ex`: JWT collection/listing/share endpoints for Svelte.
- `backend/lib/minha_casa_ai_web/controllers/parse_controller.ex`: JWT workspace parse endpoint for Svelte listing import.
- `backend/lib/minha_casa_ai_web/controllers/listings_duplicate_controller.ex`: JWT workspace duplicate-check endpoint.
- `backend/lib/minha_casa_ai_web/controllers/listing_image_controller.ex`: JWT workspace image ingestion/serve endpoints.
- `backend/lib/minha_casa_ai_web/controllers/listing_nearby_controller.ex`: JWT workspace nearby endpoint.
- `backend/lib/minha_casa_ai_web/controllers/portal_search_controller.ex`: mounted for JWT browser portal-search flows, including authenticated run streaming.
- `backend/lib/minha_casa_ai_web/controllers/short_link_controller.ex`: public short-link resolver for Svelte `/s/[shortId]`.
- `backend/lib/minha_casa_ai_web/controllers/workspace_controller.ex`: JWT workspace CRUD endpoints for links, contacts, regions, condominiums, and comparison notes.
- `backend/lib/minha_casa_ai_web/controllers/organization_controller.ex`: JWT organization/member management endpoints.
- `backend/lib/minha_casa_ai/billing.ex`: Phoenix billing/admin context for plans, subscriptions, addons, and admin stats.
- `backend/lib/minha_casa_ai_web/controllers/addon_controller.ex`: current-user/current-organization addon APIs and addon access checks.
- `backend/lib/minha_casa_ai_web/controllers/admin_controller.ex`: JWT admin endpoints for users, stats, subscriptions, plans, and addon grants.
- `backend/lib/minha_casa_ai_web/controllers/plan_controller.ex`: JWT plan listing endpoint.
- `backend/lib/minha_casa_ai_web/controllers/subscription_controller.ex`: JWT current-subscription, manual admin grant, Stripe checkout, and Stripe billing portal endpoints.
- `backend/lib/minha_casa_ai_web/controllers/stripe_webhook_controller.ex`: public Stripe webhook endpoint with signature verification and idempotency.
- `backend/lib/minha_casa_ai/billing/processed_webhook_event.ex`: Ecto schema for processed Stripe webhook IDs.
- `backend/lib/minha_casa_ai/organizations.ex`: Ecto organization context and membership validation helpers.
- `apps/web/src/lib/admin/client.ts`: Svelte admin API client and local feature flag helpers.
- `apps/web/src/lib/billing/client.ts`: Svelte billing API client for public plans and current subscription.
- `apps/web/src/lib/addons/client.ts`: Svelte addon API client and grant helpers.
- `apps/web/src/lib/addons/GrantedAddonsSection.svelte`: personal and active-organization addon management UI.
- `apps/web/src/routes/anuncios/+page.svelte`: Svelte collection/listing workspace with table/cards/OSM map modes, import/export, image thumbnails, AI import, and collection actions.
- `apps/web/src/routes/analise/+page.svelte`: Svelte property-analysis workflow with dossier, image gallery, nearby panel, v6 sections, and retry controls.
- `apps/web/src/routes/comparacao/+page.svelte`: Svelte comparison workflow with persisted slots, fixed-cell recalculation, quick map/analysis links, and notes.
- `apps/web/src/routes/explorar/+page.svelte`: Svelte portal-search workflow with filters, URL preview, matrix, polling, cost, and result tables.
- `apps/web/src/routes/organizacoes/+page.svelte`: first real Svelte organization/member workflow.
- `apps/web/src/routes/admin/+page.svelte`: first real Svelte admin workflow.
- `apps/web/src/routes/admin/feature-flags/+page.svelte`: Svelte admin feature flag workflow.
- `apps/web/src/routes/subscribe/+page.svelte`: first real Svelte subscription status/plans workflow.
- `apps/web/src/routes/floodrisk/+page.svelte`: direct Three.js flood-risk visualizer.

## Verified

```bash
pnpm check:web
docker run --rm -v "$(pwd)/backend:/app" -w /app elixir:1.18-otp-27-alpine \
  sh -lc 'apk add --no-cache build-base git >/dev/null && mix local.hex --force >/dev/null && mix local.rebar --force >/dev/null && mix deps.get >/dev/null && mix compile --warnings-as-errors'
```

Latest checks in this pass: `pnpm check:web` completed with 0 errors and 0 warnings; Phoenix `mix compile --warnings-as-errors` completed successfully through the Docker Elixir workflow.

`pnpm install` still reports deprecated transitive packages from `drizzle-kit` (`@esbuild-kit/*`). I updated Drizzle Kit and removed the direct deprecated `@types/lz-string`; the remaining warning is inside the current Drizzle toolchain and should disappear when Drizzle/Next API code is removed.

For the earlier floodrisk pass, `/floodrisk` was opened through the in-app browser at `http://localhost:5173/floodrisk`; the app correctly redirected to `/login?redirect=%2Ffloodrisk`, so the authenticated canvas still needs a logged-in visual QA pass. The route itself is covered by `svelte-check`.

## Things to revisit

- Port the remaining Drizzle/Next API behavior to Phoenix before deleting `app/api`.
- Active organization is stored in an httpOnly cookie (`minha-casa-active-organization-id`), exposed on `PageData.activeOrganizationId`, and injected as `X-Organization-Id` by the SvelteKit API proxy. Legacy localStorage keys are migrated once on layout mount.
- Stripe Checkout, billing portal session creation, webhook lifecycle handling, admin cancel/reactivate calls, and admin reconciliation are now Phoenix-backed. Reconciliation is currently read-only and reports missing/stale rows; it does not auto-repair local subscriptions.
- `/floodrisk` is ported as a first direct Three.js pass with addon gating, but it still needs logged-in screenshot QA and visual polish against the React Three Fiber version.
- `/anuncios` still needs Leaflet/Google-specific parity and final dense-table polish. The current Svelte page now has image thumbnails/lightbox, JSON import/export, card mode, cached browser geocoding, OSM map embeds, duplicate review modal, reparse/quick-reparse review flows, and richer sort/filter controls.
- `/analise` still needs exact React dossier formatting, decision notes persistence UX, stale-result messaging, and full card taxonomy parity. The current Svelte page now has dossier images, nearby data, x-ray retry, and richer ambiente rendering.
- `/comparacao` now has fixed-cell recalculation, slot count, and map/analysis links. It still needs final mobile layout parity, exact React tooltip text, and full formatting/polish parity.
- `/explorar` now has filter chips, URL preview, saved-link bridge, matrix controls, and authenticated SSE streaming with polling fallback. It still needs exact React builder URL parity for every portal edge case and final run-state polish.
- `/financiamento` now has a scenario matrix and formula cards, but still needs exact old settings panel, slider ergonomics, compact scenario card parity, and full table formatting from `/casa`.
- Continue adding Svelte UI primitives or shadcn-svelte equivalents for select, popover, sheet, tooltip, table, tabs, switch, avatar, sidebar, breadcrumb.
- Reimplement map views with Leaflet and Google Maps JS wrappers, not React bindings. `/anuncios` currently uses cached Nominatim geocoding plus OSM embeds as the Svelte-native map baseline.
- Polish `/floodrisk` against the React Three Fiber version after logged-in visual QA.
- Add Stripe reconciliation repair actions if needed; the current port only surfaces discrepancies.
- Local Docker (`infra/local/docker-compose.app.yml`) runs `svelte-web` on `:5173` instead of `next-web`; Phoenix defaults `BETTER_AUTH_JWKS_URL` to `http://svelte-web:5173/auth/jwks` on the compose network.
