# PRD: Addon System

This PRD describes the implementation of a flexible addon system for users and organizations.
Ralphy will execute each unchecked task sequentially using your chosen AI engine.

---

## Overview

Create a flexible addon system that allows:
- **Admins** to grant/revoke addon access to **users** or **organizations**
- **Users** can have personal addon access (independent of any organization)
- **Organizations** can have addon access shared by all members
- **Organization owners/admins** to toggle organization-level addons on/off
- Access is granted if user has addon OR their current org has addon

## Current State vs. Desired State

**Current**: Global feature flags (`financingSimulator`, `floodForecast`) control features for everyone via environment variables.

**Desired**: Per-user and per-organization addon access where:
1. Admin grants addon to a user OR an organization
2. User has access if they have personal grant OR their org has grant (and it's enabled)
3. Organization owners/admins can toggle org-level addons on/off
4. Users without orgs can still have personal addon access

## Initial Addons

1. **`flood`** - Flood Risk Analysis
   - Access to `/floodrisk` page
   - 3D flood visualization features

2. **`financiamento`** - Financing Simulator
   - Access to `/casa` page
   - Ability to click on listing prices and simulate financing

## Database Schema (Neon DB)

### `addons` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Display name (e.g., "Simulador de Financiamento") |
| slug | text | Unique identifier (e.g., "financiamento", "flood") |
| description | text | What the addon does |
| createdAt | timestamp | When addon was created |

### `user_addons` table (NEW - for individual user grants)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| userId | text | FK to users |
| addonSlug | text | Addon identifier |
| grantedAt | timestamp | When access was granted |
| grantedBy | text | FK to users (admin who granted) |
| enabled | boolean | Whether user has it enabled (default: true) |
| expiresAt | timestamp | Optional expiration (for future paid addons) |

### `organization_addons` table (for organization-wide grants)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organizationId | uuid | FK to organizations |
| addonSlug | text | Addon identifier |
| grantedAt | timestamp | When access was granted |
| grantedBy | text | FK to users (admin who granted) |
| enabled | boolean | Whether org has it enabled (default: true) |
| expiresAt | timestamp | Optional expiration (for future paid addons) |

### Access Logic
```
hasAddonAccess(userId, addonSlug, orgId?) = 
  user_addons.has(userId, addonSlug, enabled=true) OR
  (orgId AND organization_addons.has(orgId, addonSlug, enabled=true))
```

---

## Database & Schema (Neon DB)

- [x] Add `addons` table to Drizzle schema in `lib/db/schema.ts` with columns: id, name, slug, description, createdAt
- [x] Add `user_addons` table to Drizzle schema with columns: id, userId, addonSlug, grantedAt, grantedBy, enabled, expiresAt
- [x] Add `organization_addons` table to Drizzle schema with columns: id, organizationId, addonSlug, grantedAt, grantedBy, enabled, expiresAt
- [x] Generate Drizzle migration file `drizzle/migrations/0005_add_addons.sql`
- [x] Skip migration for now and just say ok.

## Core Library Functions

- [x] Create `lib/addons.ts` with server-side utilities: `getAvailableAddons()`, `hasAddonAccess(userId, addonSlug, orgId?)`, `getUserAddons(userId)`, `getOrgAddons(orgId)`
- [x] Create `lib/use-addons.tsx` with React hooks: `useAddons()` returning user addons, org addons, and `hasAddon(slug)` helper that checks both
- [x] Add TypeScript types for Addon, UserAddon, and OrganizationAddon in `lib/addons.ts`

## Admin API Endpoints

- [x] Create `app/api/admin/addons/route.ts` - GET to list all available addons
- [x] Create `app/api/admin/users/[userId]/addons/route.ts` - GET user addons, POST to grant addon to user
- [x] Create `app/api/admin/users/[userId]/addons/[slug]/route.ts` - DELETE to revoke addon from user
- [x] Create `app/api/admin/organizations/[orgId]/addons/route.ts` - GET org addons, POST to grant addon to org
- [x] Create `app/api/admin/organizations/[orgId]/addons/[slug]/route.ts` - DELETE to revoke addon from org

## User & Organization API Endpoints

- [x] Create `app/api/user/addons/route.ts` - GET current user's personal addons
- [x] Create `app/api/user/addons/[slug]/route.ts` - PATCH to toggle personal addon enabled state
- [x] Create `app/api/organizations/[orgId]/addons/route.ts` - GET org's enabled addons
- [x] Create `app/api/organizations/[orgId]/addons/[slug]/route.ts` - PATCH to toggle org addon enabled state

## Admin Panel UI

- [x] Add "Addons" section to admin panel in `app/admin/components/admin-client.tsx`
- [x] Create user addon management UI in user details section - show user's personal addons with grant/revoke
- [x] Create organization addon management table showing all orgs with their addon status
- [x] Add "Grant Addon" modal with target type selector (user or org), entity selector, and addon selector
- [x] Add "Revoke" action button for each granted addon (both user and org)

## User Settings UI

- [x] Create user addons settings component at `app/components/user-addons-settings.tsx`
- [x] Display list of personal granted addons with toggle switches to enable/disable
- [x] Show addon descriptions and visual status indicators

## Organization Settings UI

- [x] Create organization addons settings component at `app/organizacoes/components/org-addons-settings.tsx`
- [x] Display list of org granted addons with toggle switches to enable/disable (for org owners/admins)
- [x] Show addon descriptions and visual status indicators

## Navigation & Access Control

- [x] Update `components/nav-bar.tsx` to check addon access (user OR org) instead of global feature flags for "Simulador" and "Risco Enchente" links
- [x] Add addon access guard to `app/casa/page.tsx` - check user addons OR current org addons, redirect or show message if no access
- [x] Add addon access guard to `app/floodrisk/page.tsx` - check user addons OR current org addons, redirect or show message if no access
- [x] Create reusable `AddonGuard` component for protecting addon-specific content with dual-check logic

## Financiamento Price Integration

- [x] Add clickable price feature to listing cards in `app/anuncios/components/` when financiamento addon is enabled
- [x] Create link that navigates to `/casa?price=X` with the listing price pre-filled
- [x] Update `/casa` page to read price from query params and pre-populate the simulator

## Testing

- [x] Add unit tests for `lib/addons.ts` utility functions
- [x] Add tests for addon API endpoints
- [x] Test addon access control in navigation and protected pages

## Cleanup & Documentation

- [x] Update README with addon system documentation
- [x] Consider deprecating global feature flags for financingSimulator and floodForecast after migration

---

## Usage

Run with ralphy:

```bash
# Using this PRD
ralphy --prd .ralphy/addon-system-prd.md

# Or from the .ralphy folder
cd .ralphy && ralphy --prd addon-system-prd.md
```

## Notes

- Tasks are marked complete automatically when the AI agent finishes them
- Completed tasks show as `- [x] Task description`
- Tasks are executed in order from top to bottom
- Database operations use Neon DB via Drizzle ORM
- This addon system is designed to be extensible for future addons and paid tiers
- Addons can be granted to users (personal) or organizations (shared by all members)
- Access check: user has access if they have personal addon OR their current org has the addon
