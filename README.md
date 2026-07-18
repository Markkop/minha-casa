# Minha Casa

A platform to manage real estate listings and plan your home purchase.

## Overview

Minha Casa helps users manage and organize real estate listings with AI-powered parsing, map visualization, and collection management. The platform supports organizations for team collaboration and public/private collection sharing.

## Tech Stack

- **Frontend**: SvelteKit in `apps/web` with `@sveltejs/adapter-vercel`, TypeScript 5, and Tailwind CSS v4
- **API Backend**: Phoenix/Elixir service in `backend/` for browser APIs, parsing, workflows, chat, MCP, WhatsApp/Telegram webhooks, and MinIO attachments
- **Database**: PostgreSQL (`pg` pool) — production on VPS, local via Docker or VPS tunnel
- **Data layer**: Ecto owns the complete PostgreSQL schema and Phoenix domain model; Better Auth uses PostgreSQL directly
- **Authentication**: Better Auth in SvelteKit, with JWT verification in Phoenix
- **AI**: OpenAI Responses API (`gpt-5.4-mini` via `OPENAI_MODEL`)
- **Maps**: Leaflet + Google Maps (dual provider)
- **Testing**: Vitest, Svelte checks, and Phoenix tests

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
BETTER_AUTH_URL=http://localhost:5173
PUBLIC_APP_URL=http://localhost:5173
OPENAI_API_KEY=<openai-api-key>
```

Do not put `sslmode=require` in the URL when `DATABASE_SSL=true` — the app strips it for self-signed VPS TLS. See [docs/vps-postgres.md](docs/vps-postgres.md).

### 4. Set up the database

Create the local database and run the canonical Ecto migrations through Docker:

```bash
pnpm db:setup
```

After schema changes, use `pnpm db:migrate`. All schema changes belong in
`backend/priv/repo/migrations`; there is no second frontend migration ledger.

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:setup` | Start local PostgreSQL, rebuild Phoenix, and run Ecto migrations |
| `pnpm db:migrate` | Rebuild Phoenix and run the canonical Ecto migrations |

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

The SvelteKit app serves browser traffic from `apps/web` and proxies application
`/api/*` requests to Phoenix through `PHOENIX_API_URL` or `PUBLIC_API_URL`.
Only Better Auth endpoints are handled directly by SvelteKit.

## Project Structure

```
minha-casa/
├── apps/
│   └── web/                 # Active SvelteKit frontend and browser-facing BFF
│       ├── src/routes/      # Pages and same-origin API proxy routes
│       ├── src/lib/         # Svelte UI, clients, auth, billing, maps, and stores
│       └── svelte.config.js # SvelteKit config with Vercel adapter
├── backend/                 # Phoenix/Elixir API and AI backend
│   └── priv/repo/migrations # The only application migration history
├── infra/                   # Local and VPS Docker Compose stacks
├── scripts/                 # Docker-backed database and operational commands
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
- Organization overview and agency plan management
- Usage statistics

## Ferramentas

`/ferramentas` is the authenticated catalog for focused property-evaluation tools. These tools are available to every signed-in user and do not require feature grants, organization toggles, or an active subscription.

| Ferramenta | Rota | Descrição |
|------------|------|-----------|
| Risco de alagamento | `/floodrisk` | Simulação de níveis de água e risco de inundação no terreno |
| Planta | `/planta` | Anotação de medidas e ambientes sobre uma planta baixa |

Financeiro remains a separate left-navigation destination at `/financeiro`; `/financiamento` and `/casa` are compatibility redirects. Its authenticated persistence APIs are also subscription-independent. The legacy `/addons` URL redirects to `/ferramentas`.

## Feature Flags

Feature flags control visibility of incomplete or optional features. Configure via environment variables:

| Flag | Env Variable | Default | Description |
|------|-------------|---------|-------------|
| `organizations` | `PUBLIC_FF_ORGANIZATIONS` | `true` | Enable organizations |
| `publicCollections` | `PUBLIC_FF_PUBLIC_COLLECTIONS` | `true` | Enable public sharing |
| `mapProvider` | `PUBLIC_FF_MAP_PROVIDER` | `auto` | Map provider (`google`, `leaflet`, `auto`) |

**Note**: Ferramentas and Financeiro require authentication but are independent of feature flags and subscription access.

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
