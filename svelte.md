# SvelteKit frontend migration notes

## Current state

The new frontend scaffold lives in `apps/web`. It follows the `todo-idle-quest` pattern: SvelteKit owns UI and Better Auth, while Phoenix should become the browser-facing API through Better Auth JWTs.

This is not a complete UI parity port yet. The shell, auth pages, route guard structure, API client, route surface, and Phoenix JWT foundation are in place. Several high-traffic routes now use Svelte UI against Phoenix APIs directly:

- `/anuncios`: collection/listing CRUD, active collection persistence, favorites, sharing toggle, listing table, manual listing entry/edit/delete.
- `/analise`: collection/listing selector, latest analysis load, start analysis, polling, step retry, and basic v6 result sections.
- `/comparacao`: collection/listing selectors, persisted comparison slots, matrix view, and comparison notes.
- `/explorar`: portal-search CRUD/run polling, filter form, portal/bairro summaries, target status, cost summary, and result table through Phoenix JWT APIs.
- `/links`, `/contatos`, `/regioes`, `/condominios`, `/visao-geral`: workspace CRUD backed by Phoenix JWT APIs.
- `/conectar-whatsapp` and `/conectar-telegram`: pending-code handling, login redirect, status, and linking through Phoenix JWT APIs.
- `/organizacoes`: organization creation/selection, member listing, member role updates/removal, and active organization context for subsequent Phoenix JWT API calls.
- `/financiamento`: standalone SAC simulator with extra amortization scenario.
- `/casa`: redirects to `/financiamento`, preserving current Next behavior.
- `/share/[token]`: public shared collection table backed by Phoenix.
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

SvelteKit auth expects:

```bash
DATABASE_URL=postgresql://minhacasa:minhacasa_local_password@localhost:5435/minha_casa_local
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
PUBLIC_API_URL=http://localhost:4000
PUBLIC_GOOGLE_MAPS_API_KEY=...
```

Phoenix will also need:

```bash
BETTER_AUTH_JWKS_URL=http://localhost:5173/auth/jwks
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

The backend now has JWT-authenticated browser endpoints, starting with:

```text
GET /api/me
Authorization: Bearer <better-auth-jwt>
```

The Svelte API client calls Phoenix with Better Auth JWTs. It also sends `X-Organization-Id` when the user selects an active organization in `/organizacoes`; Phoenix validates membership in `JwtAuth` before assigning `current_org_id`. Existing internal Phoenix routes are still mounted for parts not yet migrated; do not expose internal headers to browser code.

## Key files

- `apps/web/src/hooks.server.ts`: Better Auth handler, session population, auth redirects, subscription route gating.
- `apps/web/src/lib/auth.ts`: Better Auth server config with JWT plugin and direct Postgres pool.
- `apps/web/src/lib/auth-client.ts`: Svelte Better Auth client.
- `apps/web/src/lib/stores/auth.ts`: cached JWT helper for Phoenix API calls.
- `apps/web/src/lib/api/client.ts`: browser API client that calls `PUBLIC_API_URL + /api/...` with `Authorization: Bearer`.
- `apps/web/src/lib/components/layout/WorkspaceShell.svelte`: first Svelte version of the app navigation shell.
- `backend/lib/minha_casa_ai/auth/jwks.ex`: JWKS cache/verifier for Better Auth tokens.
- `backend/lib/minha_casa_ai_web/plugs/jwt_auth.ex`: Phoenix bearer-token plug for new browser APIs.
- `backend/lib/minha_casa_ai_web/controllers/user_controller.ex`: `/api/me` smoke endpoint.
- `backend/lib/minha_casa_ai_web/controllers/collection_controller.ex`: JWT collection/listing/share endpoints for Svelte.
- `backend/lib/minha_casa_ai_web/controllers/portal_search_controller.ex`: now mounted for JWT browser use for non-SSE portal-search flows.
- `backend/lib/minha_casa_ai_web/controllers/short_link_controller.ex`: public short-link resolver for Svelte `/s/[shortId]`.
- `backend/lib/minha_casa_ai_web/controllers/workspace_controller.ex`: JWT workspace CRUD endpoints for links, contacts, regions, condominiums, and comparison notes.
- `backend/lib/minha_casa_ai_web/controllers/organization_controller.ex`: JWT organization/member management endpoints.
- `backend/lib/minha_casa_ai/organizations.ex`: Ecto organization context and membership validation helpers.
- `apps/web/src/routes/anuncios/+page.svelte`: first real Svelte collection/listing workspace.
- `apps/web/src/routes/analise/+page.svelte`: first real Svelte property-analysis workflow.
- `apps/web/src/routes/comparacao/+page.svelte`: first real Svelte comparison workflow.
- `apps/web/src/routes/explorar/+page.svelte`: first real Svelte portal-search workflow.
- `apps/web/src/routes/organizacoes/+page.svelte`: first real Svelte organization/member workflow.

## Verified

```bash
pnpm check:web
docker run --rm -v "$(pwd)/backend:/app" -w /app elixir:1.18-otp-27-alpine \
  sh -lc 'apk add --no-cache build-base git >/dev/null && mix local.hex --force >/dev/null && mix local.rebar --force >/dev/null && mix compile --warnings-as-errors'
```

`pnpm install` still reports deprecated transitive packages from `drizzle-kit` (`@esbuild-kit/*`). I updated Drizzle Kit and removed the direct deprecated `@types/lz-string`; the remaining warning is inside the current Drizzle toolchain and should disappear when Drizzle/Next API code is removed.

## Things to revisit

- Port the remaining Drizzle/Next API behavior to Phoenix before deleting `app/api`.
- Active organization is currently stored in localStorage by the Svelte API client and sent as `X-Organization-Id`; revisit whether this should move to a server session/cookie for SSR and cross-tab polish.
- Replace remaining route placeholders with real Svelte pages: `/floodrisk`, `/admin`, `/admin/feature-flags`, and billing/subscription flows.
- `/anuncios` still needs AI parser/import/reparse modals, duplicate review, image ingestion controls, maps, rich mobile cards, title sync, copy collection, export, and the old dense table controls.
- `/analise` still needs the full dossier UI, image gallery, per-card x-ray retry controls, nearby places, stale-result messaging, and richer step rendering.
- `/comparacao` still needs the advanced fixed-cell recalculation UX, responsive slot layout, maps/analysis links, and all formatting parity from React.
- `/explorar` still needs the full filter-builder ergonomics, matrix controls, saved-link bridge, authenticated SSE or tokenized run streaming, and all React matrix variants.
- `/financiamento` is a focused SAC simulator, not the full old scenario matrix/settings panel.
- Add Svelte UI primitives or shadcn-svelte equivalents for button, input, select, popover, sheet, tooltip, table, tabs, switch, card, avatar, sidebar, breadcrumb.
- Reimplement map views with Leaflet and Google Maps JS wrappers, not React bindings.
- Reimplement `/floodrisk` with Threlte or direct Three.js.
- Port Stripe checkout, portal, webhooks, admin reconciliation, plans, subscriptions, addons, and remaining listing/parser/image endpoints into Phoenix/Svelte.
- Update Docker compose after Phoenix JWT is available: replace `next-web` with `svelte-web`, set `BETTER_AUTH_URL` to the Svelte origin, and set `BETTER_AUTH_JWKS_URL` for Phoenix.
