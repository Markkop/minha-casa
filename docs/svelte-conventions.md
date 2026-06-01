# Svelte conventions (Minha Casa web)

Conventions for `apps/web` during the SvelteKit migration. Prefer matching existing routes and `$lib` patterns over introducing new abstractions.

## Runes-only components

- Use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`) in new and migrated `.svelte` files.
- Do not add new `export let` props, `$$props`, or legacy `createEventDispatcher` unless bridging unmigrated code.
- Colocate reactive modules in `.svelte.ts` when logic is shared or heavy; keep `.svelte` files mostly markup and wiring.

## Snippets

- Pass UI slots with `{#snippet}` / `{@render}` instead of named slot attributes where the parent already uses snippets.
- Type snippet props when the API is non-obvious; keep snippet names short and role-based (`actions`, `title`, `empty`).

## Context vs `load`

| Concern | Use |
|--------|-----|
| SSR-friendly initial lists, route params, auth/session-derived data | `+page.ts` / `+layout.ts` `load` (and `+page.server.ts` when you need `cookies` / `request` only on the server) |
| Cross-route client state (active collection, modals, table UI) | `setContext` / `getContext` or `.svelte.ts` module state |
| Active organization id for API calls | httpOnly cookie + layout `PageData`; client cache in `$lib/active-organization.ts` |

- Prefer `depends('app:…')` in `load` and `invalidate('app:…')` after mutations instead of re-fetching the same list only in `onMount`.
- Use `invalidateAll: true` sparingly (e.g. organization switcher changing workspace-wide data).

## Component size

- Target **~400 lines** per `.svelte` file; split into child components or `.svelte.ts` when a screen grows beyond that.
- Extract pure helpers (sort, filter, formatting, slot math) to plain `.ts` files so Vitest can cover them without mounting components.

## Lists: keyed `{#each}`

- Always key `{#each}` with a stable id: `{#each items as item (item.id)}`.
- Avoid array index keys for entities that can be reordered, deleted, or updated in place.

## `$app/state` vs stores

- Prefer `$app/state` (`page`, `navigating`, etc.) for framework routing state in SvelteKit 2.
- Use module-level runes or context for app domain state; avoid new Svelte stores unless integrating a library that requires them.

## When to use `$effect`

Use `$effect` when you must **synchronize** with something outside Svelte’s reactive graph:

- Subscribing to `window`, `matchMedia`, or third-party widgets (maps, charts).
- Applying props from `load` data into local editable state when the user can mutate before the next navigation.
- Running cleanup (listeners, timers, observers) via the returned teardown function.

Avoid `$effect` when `$derived` is enough (computed values from props/state). Do not use `$effect` for event-driven logic that belongs in event handlers or `load`/`invalidate`.

## Testing

- Pure functions live in `.ts` (or extracted from `.svelte.ts`); cover them with Vitest (`pnpm --dir apps/web test`).
- Do not mount Svelte components in unit tests unless necessary; favor helper and context-free logic tests.

## Related docs

- Migration and env setup: [`svelte.md`](../svelte.md) at the repo root.
- Agent workflow: [`AGENTS.md`](../AGENTS.md).
