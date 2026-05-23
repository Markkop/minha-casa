# Minha Casa

A platform to manage real estate listings and plan your home purchase.

## Overview

Minha Casa helps users manage and organize real estate listings with AI-powered parsing, map visualization, and collection management. The platform supports organizations for team collaboration and public/private collection sharing.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Frontend**: React 19, Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Database**: PostgreSQL (`pg` pool) — production on VPS, local via Docker or VPS tunnel
- **ORM**: Drizzle ORM
- **Authentication**: BetterAuth
- **AI**: OpenAI SDK (gpt-4o-mini)
- **AI Backend**: Phoenix/Elixir service in `backend/` for parsing, workflows, chat, MCP, WhatsApp webhooks, and MinIO attachments
- **Maps**: Leaflet + Google Maps (dual provider)
- **Testing**: Vitest + React Testing Library

## Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- PostgreSQL (see [docs/vps-postgres.md](docs/vps-postgres.md) for production VPS setup)
- OpenAI API key

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd minha-casa
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in values. For local dev against the production VPS database:

```env
DATABASE_URL=postgresql://minhacasa:<password>@<VPS_HOST>:5433/minha_casa_prod
DATABASE_SSL=true
BETTER_AUTH_SECRET=<strong-random-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENAI_API_KEY=<openai-api-key>
```

Do not put `sslmode=require` in the URL when `DATABASE_SSL=true` — the app strips it for self-signed VPS TLS. See [docs/vps-postgres.md](docs/vps-postgres.md).

### 4. Set up the database

Generate and run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema changes directly |
| `pnpm db:studio` | Open Drizzle Studio |

## Dockerized AI Backend

The Elixir backend lives in `backend/` and is designed to run locally and on the VPS with Docker.

Local full stack:

```bash
docker compose -f infra/local/docker-compose.app.yml --env-file infra/local/.env.local.example up
```

Backend health check:

```bash
curl http://localhost:4000/health
```

The backend boots without optional credentials. Features that need OpenAI, ScrapingAnt, MinIO, or WhatsApp validate those env vars when called and return a feature-specific error if missing.

Next.js consumes Phoenix server-side through `/api/parse` when `INTERNAL_BACKEND_URL` or `BACKEND_API_URL` is configured. Without those env vars, the existing in-process parser remains as a local fallback.

## Project Structure

```
minha-casa/
├── app/                      # Next.js App Router pages
│   ├── admin/               # Admin panel (users, subscriptions)
│   ├── anuncios/            # Listings manager (MVP focus)
│   │   ├── components/      # Listings UI components
│   │   └── lib/             # Listings-specific utilities
│   ├── api/                 # API routes
│   │   ├── auth/           # BetterAuth endpoints
│   │   ├── collections/    # Collections CRUD
│   │   ├── listings/       # Listings CRUD
│   │   ├── organizations/  # Organizations CRUD
│   │   ├── parse/          # AI parsing endpoint
│   │   └── ...
│   ├── casa/               # Legacy redirect to /financiamento
│   ├── financiamento/      # Financing simulator
│   ├── floodrisk/          # Flood risk visualization (feature flagged)
│   ├── login/              # Login page
│   ├── organizacoes/       # Organizations management
│   ├── share/              # Public share pages
│   ├── signup/             # Registration page
│   └── subscribe/          # Subscription page
├── components/              # Shared components
│   ├── addon-guard.tsx    # Addon access control component
│   ├── nav-bar.tsx        # Navigation with addon-aware links
│   └── ui/                 # shadcn/ui components
├── drizzle/                 # Database migrations
│   └── migrations/
├── backend/                 # Phoenix/Elixir AI backend
├── lib/                     # Shared utilities
│   ├── db/                 # Database schema and connection
│   │   ├── index.ts       # DB connection
│   │   └── schema.ts      # Drizzle schema definitions
│   ├── addons.ts          # Server-side addon utilities
│   ├── auth.ts            # BetterAuth configuration
│   ├── auth-client.ts     # Client-side auth utilities
│   ├── auth-server.ts     # Server-side auth utilities
│   ├── feature-flags.ts   # Feature flags system
│   ├── subscription.ts    # Subscription utilities
│   ├── use-addons.tsx     # React hooks for addon access
│   └── utils.ts           # General utilities
├── public/                  # Static assets
├── drizzle.config.ts       # Drizzle configuration
├── middleware.ts           # Auth middleware
└── package.json
```

## Features

### Listings Manager (`/anuncios`)

- **AI-Powered Parsing**: Parse listing text using OpenAI to extract structured data
- **Collection System**: Organize listings into multiple collections
- **Map View**: Visualize listings on Google Maps or Leaflet
- **Sorting & Filtering**: Sort by price, area, rooms; filter by search and property type
- **Status Tracking**: Mark listings as starred, visited, or strikethrough
- **Import/Export**: JSON import/export and URL-based sharing

### Authentication

- Email/password authentication via BetterAuth
- Session-based auth with secure cookies
- Protected routes with middleware

### Organizations

- Create and manage organizations
- Invite members with different roles (owner, admin, member)
- Share collections within organizations

### Subscriptions

- Plan-based access control (Teste, Plus)
- Admin-managed subscription granting
- Subscription status checking in middleware

### Admin Panel (`/admin`)

- User management
- Subscription management
- Addon management (grant/revoke addons to users and organizations)
- Usage statistics

## Addon System

The platform features a flexible addon system that allows granular feature access control for users and organizations.

### Overview

- **Admins** can grant/revoke addon access to users or organizations
- **Users** can have personal addon access (independent of any organization)
- **Organizations** can have addon access shared by all members
- **Organization owners/admins** can toggle organization-level addons on/off
- Access is granted if user has addon OR their current org has addon

### Available Addons

| Addon | Slug | Description |
|-------|------|-------------|
| Simulador de Financiamento | `financiamento` | Financing simulator access; `/casa` redirects to `/financiamento` |
| Risco de Enchente | `flood` | Access to `/floodrisk` flood risk analysis and 3D visualization |

### Access Control Logic

```
hasAddonAccess(userId, addonSlug, orgId?) = 
  user_addons.has(userId, addonSlug, enabled=true) OR
  (orgId AND organization_addons.has(orgId, addonSlug, enabled=true))
```

### Addon API Routes

**Admin endpoints:**
- `GET /api/admin/addons` - List all available addons
- `GET /api/admin/users/[userId]/addons` - Get user's addons
- `POST /api/admin/users/[userId]/addons` - Grant addon to user
- `DELETE /api/admin/users/[userId]/addons/[slug]` - Revoke addon from user
- `GET /api/admin/organizations/[orgId]/addons` - Get org's addons
- `POST /api/admin/organizations/[orgId]/addons` - Grant addon to org
- `DELETE /api/admin/organizations/[orgId]/addons/[slug]` - Revoke addon from org

**User endpoints:**
- `GET /api/user/addons` - Get current user's personal addons
- `PATCH /api/user/addons/[slug]` - Toggle personal addon enabled state

**Organization endpoints:**
- `GET /api/organizations/[orgId]/addons` - Get org's enabled addons
- `PATCH /api/organizations/[orgId]/addons/[slug]` - Toggle org addon enabled state

### React Hooks & Components

**Hooks** (`lib/use-addons.tsx`):

```tsx
// Access addon context
const { userAddons, orgAddons, hasAddon, isLoading } = useAddons()

// Check specific addon access
const hasFinancing = useHasAddon('financiamento')

// Check loading state
const isLoading = useAddonsLoading()
```

**Components** (`components/addon-guard.tsx`):

```tsx
// Guard content behind addon access
<AddonGuard addonSlug="financiamento" addonName="Simulador de Financiamento">
  <ProtectedContent />
</AddonGuard>

// Conditionally show content (no fallback UI)
<AddonContent addonSlug="flood">
  <FloodRiskWidget />
</AddonContent>
```

## Feature Flags

Feature flags control visibility of incomplete or optional features. Configure via environment variables:

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `organizations` | `NEXT_PUBLIC_FF_ORGANIZATIONS` | `true` | Enable organizations |
| `publicCollections` | `NEXT_PUBLIC_FF_PUBLIC_COLLECTIONS` | `true` | Enable public sharing |
| `mapProvider` | `NEXT_PUBLIC_FF_MAP_PROVIDER` | `auto` | Map provider (`google`, `leaflet`, `auto`) |

**Note**: Access to `/floodrisk` (Flood Forecast) is controlled by the addon system instead of feature flags. Financing is available to Plus workspace users through `/financiamento`, with `/casa` kept as a compatibility redirect.

## Database Schema

The application uses the following main tables:

- **users**: User accounts with email/password auth
- **accounts**: BetterAuth OAuth/credential accounts
- **sessions**: User sessions
- **plans**: Subscription plans (Teste, Plus)
- **subscriptions**: User subscriptions
- **organizations**: Team organizations
- **organization_members**: Org membership with roles
- **collections**: Listing collections (user or org owned)
- **listings**: Individual real estate listings
- **saved_links**: User/org saved search links and reference URLs
- **contacts**: Manual and listing-derived contacts
- **regions**: Manual neighborhood/city m2 benchmarks
- **condominiums**: Reusable condominium context and amenities
- **listing_comparison_notes**: Pros, cons, and notes for shortlist comparison
- **addons**: Available addon definitions (slug, name, description)
- **user_addons**: Addon grants for individual users
- **organization_addons**: Addon grants for organizations

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

Tests are written using Vitest and React Testing Library. Test files are co-located with their source files using the `.test.ts` or `.test.tsx` extension.

## API Routes

### Authentication
- `POST /api/auth/*` - BetterAuth endpoints

### Collections
- `GET /api/collections` - List user's collections
- `POST /api/collections` - Create collection
- `GET /api/collections/[id]` - Get collection with listings
- `PUT /api/collections/[id]` - Update collection
- `DELETE /api/collections/[id]` - Delete collection

### Listings
- `POST /api/listings` - Create listing
- `PUT /api/listings/[id]` - Update listing
- `DELETE /api/listings/[id]` - Delete listing

### Organizations
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details
- `PUT /api/organizations/[id]` - Update organization
- `DELETE /api/organizations/[id]` - Delete organization

### AI Parsing
- `POST /api/parse` - Parse listing text with AI

## License

Private - All rights reserved.
