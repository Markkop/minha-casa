# Minha Casa Better Auth + Google Login + VPS Postgres Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Bring Minha Casa auth to the same practical model as Todo Idle Quest: Better Auth with email/password and Google login, legal pages required for Google OAuth review/consent, and a separate Postgres container/database on the existing Todo Idle Quest VPS while keeping the frontend/API hosted on Vercel.

**Architecture:** Minha Casa is already a Next.js 16 app with Better Auth, Drizzle, email/password screens, Stripe/subscription tables, and API routes. The main work is to harden/complete the existing auth implementation: add Google social provider, expose Google buttons in login/signup, add public legal pages, use the standard `pg` pool driver against the VPS Postgres from Vercel, and provision an isolated Postgres container on the VPS. Because Vercel will execute the Next.js API routes, the VPS Postgres endpoint must be reachable from Vercel; use TLS, a strong password, a non-default port, and a dedicated DB/user.

**Tech Stack:** Next.js 16 App Router, React 19, Better Auth, Drizzle ORM, node-postgres (`pg`), Postgres 17 Docker container on VPS, Vercel env vars, Google OAuth Web Client.

---

## Current Context

- Repo: `/Users/marcelokopmann/workspace/minha-casa`
- Current auth already exists:
  - `lib/auth.ts` configures `betterAuth` with `drizzleAdapter` and email/password enabled.
  - `app/api/auth/[...all]/route.ts` exposes Better Auth handlers through Next.js.
  - `app/login/login-client.tsx` supports email/password login.
  - `app/signup/signup-client.tsx` supports email/password signup.
  - `proxy.ts` protects app routes by checking Better Auth session cookies.
- Missing for the requested target:
  - Google provider in `lib/auth.ts`.
  - Google login/signup buttons and callback redirect handling.
  - Public `/privacy` and `/terms` pages.
  - Public route allowlist entries for `/privacy` and `/terms` in `proxy.ts`.
  - `.env.example` Google OAuth placeholders.
  - DB driver: `pg` pool + `drizzle-orm/node-postgres` (implemented in `lib/db/pool.ts`, `lib/db/index.ts`).
  - VPS Postgres container/service dedicated to Minha Casa.

## Key Decision: VPS DB + Vercel Frontend

Because the host stays on Vercel, the Next.js server/API code will run on Vercel and must connect to the database over the public internet.

Recommended implementation:

- Create a separate Postgres container on the same VPS as Todo Idle Quest.
- Use a distinct container, volume, DB, and DB user:
  - container: `minha-casa-db-1`
  - database: `minha_casa_prod`
  - user: `minhacasa`
  - external port: `5433` or another non-default port
- Enable Postgres TLS inside the container.
- Use strong generated credentials.
- Put only the final connection string in Vercel env vars.
- Do **not** reuse Todo Idle Quest DB/user/container.

Risk: without a static Vercel egress IP, the DB port likely cannot be firewalled to only Vercel. Strong password + TLS is acceptable for beta; for production-grade hardening use managed Postgres, a Vercel static egress add-on, or a small VPS-hosted backend instead of direct DB access from Vercel.

---

## Google OAuth Dashboard Values Mark Needs Later

After implementation and deployment of legal pages, create a Google OAuth Web Client with:

- Authorized JavaScript origins:
  - `https://<minha-casa-production-domain>`
  - `http://localhost:3000` for local dev
- Authorized redirect URIs:
  - `https://<minha-casa-production-domain>/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google`

Then set in Vercel and local `.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_URL=https://<minha-casa-production-domain>
BETTER_AUTH_TRUSTED_ORIGINS=https://<minha-casa-production-domain>,http://localhost:3000
```

---

## Task 1: Confirm env safety and current DB assumptions

**Objective:** Verify `.env` is ignored and identify any committed secrets/placeholders before touching auth/DB config.

**Files:**
- Read: `.gitignore`
- Read: `.env.example`
- Read: `drizzle.config.ts`
- Read: `lib/db/index.ts`
- Read: `lib/auth.ts`

**Steps:**

1. Run:
   ```bash
   git check-ignore .env .env.local .env.production || true
   git status --short
   ```
2. If `.env*` files are not ignored, patch `.gitignore` before adding any local secrets.
3. Do not print real secrets from any local env file.
4. Confirm `DATABASE_URL` points at VPS prod (or local Docker Postgres) before migration.

**Verification:**

- `.env`, `.env.local`, `.env.production` are ignored.
- No secrets are added to git.

---

## Task 2: Standard Postgres Pool (pg) for VPS

**Objective:** Make app DB access work with the self-hosted VPS Postgres endpoint from Vercel.

**Files:**
- Modify: `package.json`
- Modify: `lib/db/index.ts`
- Modify: `lib/auth.ts`
- Possibly modify: tests that mock `@/lib/db`

**Dependency change:**

Install:

```bash
npm install pg
npm install -D @types/pg
```

Do not add `@neondatabase/serverless` — use `pg` only.

**Implementation approach:**

- Use:
  - `pg`
  - `drizzle-orm/node-postgres`
- Create one shared pool helper so `lib/db/index.ts` and `lib/auth.ts` do not duplicate pool creation.

Recommended new file:

- Create: `lib/db/pool.ts`

Core shape:

```ts
import { Pool } from "pg"

const globalForPg = globalThis as unknown as {
  minhaCasaPgPool?: Pool
}

export function getPgPool() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  if (!globalForPg.minhaCasaPgPool) {
    globalForPg.minhaCasaPgPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? "5"),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  }

  return globalForPg.minhaCasaPgPool
}
```

Then:

```ts
// lib/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"
import { getPgPool } from "./pool"

export function getDb() {
  return drizzle(getPgPool(), { schema })
}

export * from "./schema"
```

And in `lib/auth.ts`, use `getDb()` for the Drizzle adapter.

**Verification:**

```bash
npm run lint
npm test -- --runInBand
```

If the project test runner does not accept `--runInBand`, run:

```bash
npm test
```

---

## Task 3: Complete Better Auth config with Google provider

**Objective:** Match Todo Idle Quest’s useful Better Auth pieces while staying idiomatic for Next.js.

**Files:**
- Modify: `lib/auth.ts`
- Modify: `.env.example`

**Config changes:**

Add to `betterAuth({ ... })`:

```ts
baseURL: process.env.BETTER_AUTH_URL,
secret: process.env.BETTER_AUTH_SECRET,
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
},
```

Keep:

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: false,
},
```

Keep current `user.additionalFields.isAdmin` unless product requirements change.

Update `.env.example`:

```env
# Better Auth canonical URL. In prod: https://your-domain.com
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000"

# Google OAuth Web Client credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Use “PostgreSQL” in env comments and docs (see `docs/vps-postgres.md`).

**Verification:**

- `npm run lint`
- Confirm `/api/auth` route still compiles.
- Confirm no real Google secret is committed.

---

## Task 4: Add Google login and signup UI

**Objective:** Let users authenticate with Google from both login and signup pages.

**Files:**
- Modify: `app/login/login-client.tsx`
- Modify: `app/signup/signup-client.tsx`
- Modify tests:
  - `app/login/login-client.test.tsx`
  - `app/signup/signup-client.test.tsx`

**Implementation details:**

- Import `authClient` or expose `signIn.social` from `lib/auth-client.ts`.
- Login button behavior:

```ts
await authClient.signIn.social({
  provider: "google",
  callbackURL: searchParams.get("redirect") || "/anuncios",
})
```

- Signup page can use:

```ts
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/anuncios",
})
```

- UI:
  - Add a secondary outline button: `Continuar com Google`.
  - Add divider text: `ou`.
  - Disable both form submit and Google button while loading/socialLoading.
  - Keep email/password as first-class support.

**Verification:**

- Unit tests assert Google button exists.
- Unit tests assert clicking Google button calls `signIn.social`/`authClient.signIn.social` with provider `google` and expected callback URL.
- `npm test app/login/login-client.test.tsx app/signup/signup-client.test.tsx`

---

## Task 5: Add public Privacy Policy and Terms pages

**Objective:** Provide the pages needed before Mark configures Google OAuth consent/client credentials.

**Files:**
- Create: `app/privacy/page.tsx`
- Create: `app/terms/page.tsx`
- Modify: `proxy.ts`
- Optionally modify: `app/layout.tsx` or home/footer component if footer/nav links exist

**Content requirements:**

Privacy page should mention:

- What data is collected:
  - account name/email/profile image from login providers,
  - user-created listings/collections/organizations,
  - subscription/payment metadata from Stripe if used,
  - operational logs/cookies/session data.
- Why data is used:
  - authentication,
  - saving user data,
  - subscriptions/access control,
  - support/security.
- Third-party processors:
  - Google OAuth,
  - Vercel,
  - VPS/Postgres hosting,
  - Stripe,
  - OpenAI if listing parsing uses it.
- Contact/delete/export process: “contact us” placeholder until a self-service flow exists.

Terms page should mention:

- Account responsibility.
- Acceptable use.
- Subscription/payment terms if enabled.
- No professional/legal/financial advice disclaimer for real estate calculators/flood risk/tools.
- Termination/deletion via contact.

Patch `proxy.ts`:

```ts
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/privacy", "/terms"]
```

**Verification:**

```bash
npm run lint
```

Manual local smoke:

```bash
npm run dev
# Open /privacy and /terms without logging in
```

---

## Task 6: Provision separate Minha Casa Postgres on the Todo Idle Quest VPS

**Objective:** Create an isolated Postgres container and persistent volume for Minha Casa without touching Todo Idle Quest DB/container.

**Files:**
- Option A, repo-managed: create `infra/vps/minha-casa-db/docker-compose.yml`
- Option B, server-only: create `/docker/minha-casa-db/docker-compose.yml` directly on VPS

**Recommended Compose:**

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: minha-casa-db-1
    restart: unless-stopped
    environment:
      POSTGRES_USER: minhacasa
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: minha_casa_prod
      POSTGRES_INITDB_ARGS: "--auth-host=scram-sha-256 --auth-local=scram-sha-256"
    command:
      - "postgres"
      - "-c"
      - "password_encryption=scram-sha-256"
      - "-c"
      - "ssl=on"
      - "-c"
      - "ssl_cert_file=/var/lib/postgresql/server.crt"
      - "-c"
      - "ssl_key_file=/var/lib/postgresql/server.key"
    ports:
      - "5433:5432"
    volumes:
      - minha_casa_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minhacasa -d minha_casa_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  minha_casa_pgdata:
```

**VPS steps:**

1. SSH using `.ssh-prod` from Todo Idle Quest repo.
2. Create directory:
   ```bash
   mkdir -p /docker/minha-casa-db
   cd /docker/minha-casa-db
   ```
3. Generate password:
   ```bash
   openssl rand -base64 36
   ```
4. Create `.env`:
   ```env
   POSTGRES_PASSWORD=<generated-password>
   ```
5. Generate self-signed cert in the volume after first init or mount certs carefully with correct ownership. Ensure Postgres key is `0600` and owned by postgres inside container.
6. Start:
   ```bash
   docker compose up -d
   docker compose ps
   docker logs --tail=80 minha-casa-db-1
   ```
7. Verify from VPS:
   ```bash
   docker exec minha-casa-db-1 psql -U minhacasa -d minha_casa_prod -c 'select version();'
   ```
8. Verify from local/Vercel-like network after opening firewall port:
   ```bash
   psql "postgresql://minhacasa:<password>@72.61.75.8:5433/minha_casa_prod?sslmode=require" -c 'select 1;'
   ```

**Important:** Do not run `docker volume prune` and do not touch `todo-idle-quest-db-1`.

---

## Task 7: Run Drizzle migrations against the new VPS DB

**Objective:** Create Minha Casa schema in the new isolated DB.

**Files:**
- Existing migrations: `drizzle/migrations/*`
- Existing schema: `lib/db/schema.ts`

**Steps:**

1. Set a local temporary `DATABASE_URL` pointing to the new VPS DB.
2. Run:
   ```bash
   npm run db:migrate
   ```
3. If migrations are stale compared to schema:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
4. Seed required plans/addons if current product expects them. Search for existing seed scripts first:
   ```bash
   # use search_files instead of shell find/grep during implementation
   ```

**Reset permission:** Mark explicitly allowed user DB reset if easier. Since this is a new DB, prefer fresh migrations. If reusing an existing Minha Casa DB, reset only Minha Casa DB/tables, not Todo Idle Quest.

**Verification:**

```sql
select count(*) from users;
select count(*) from plans;
select count(*) from addons;
```

---

## Task 8: Configure Vercel env vars

**Objective:** Point Vercel deployment at the VPS Postgres DB and enable Better Auth/Google once Mark has credentials.

**Vercel env vars:**

```env
DATABASE_URL=postgresql://minhacasa:<password>@72.61.75.8:5433/minha_casa_prod?sslmode=require
DATABASE_SSL=true
DATABASE_POOL_MAX=5
BETTER_AUTH_URL=https://<minha-casa-production-domain>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_TRUSTED_ORIGINS=https://<minha-casa-production-domain>
NEXT_PUBLIC_APP_URL=https://<minha-casa-production-domain>
GOOGLE_CLIENT_ID=<from Google dashboard>
GOOGLE_CLIENT_SECRET=<from Google dashboard>
```

Keep existing required env vars:

```env
OPENAI_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
SHARE_MASTER_PASSWORD=...
```

**Verification:**

- Redeploy Vercel after env changes.
- Open `/privacy`, `/terms`, `/login`, `/signup`.
- Email signup creates a user row in VPS DB.
- Login sets Better Auth session cookie.
- Google button redirects to Google consent once Mark adds credentials.

---

## Task 9: Google dashboard setup after pages are live

**Objective:** Give Mark the exact Google Console setup steps after deployment.

**Steps for Mark:**

1. Google Cloud Console → APIs & Services → OAuth consent screen.
2. Set app name: `Minha Casa`.
3. Add user support email.
4. Add app domain.
5. Add links:
   - Homepage: `https://<domain>`
   - Privacy Policy: `https://<domain>/privacy`
   - Terms: `https://<domain>/terms`
6. Credentials → Create Credentials → OAuth client ID → Web application.
7. Add origins and redirect URIs listed above.
8. Copy Client ID/Secret into Vercel env vars.
9. Redeploy.

**Verification:**

- `/api/auth/sign-in/social` or Better Auth social initiation should redirect to Google.
- After Google callback, user lands in `/anuncios` and has a session.
- DB `users` and `accounts` tables contain the Google user/account rows.

---

## Task 10: End-to-end validation checklist

**Objective:** Prove auth works before calling it done.

**Local validation:**

```bash
npm run lint
npm test
npm run build
```

Only run `npm run build` if Mark asks or once implementation is ready for final validation.

**Production validation:**

- `/privacy` loads unauthenticated.
- `/terms` loads unauthenticated.
- `/login` loads unauthenticated.
- `/signup` loads unauthenticated.
- Email/password signup works.
- Email/password login works.
- Google login works after credentials are configured.
- `/anuncios` redirects unauthenticated users to `/login?redirect=/anuncios`.
- Authenticated user can access `/anuncios` subject to current subscription gate behavior.
- `docker ps` on VPS shows `minha-casa-db-1` healthy.
- DB rows are created in `minha_casa_prod`, not in Todo Idle Quest DB.

---

## Files Likely to Change

- `package.json`
- `package-lock.json` or `pnpm-lock.yaml` / `yarn.lock`, depending on the repo lockfile
- `.env.example`
- `lib/db/pool.ts` new
- `lib/db/index.ts`
- `lib/auth.ts`
- `lib/auth-client.ts` maybe
- `app/login/login-client.tsx`
- `app/signup/signup-client.tsx`
- `app/login/login-client.test.tsx`
- `app/signup/signup-client.test.tsx`
- `app/privacy/page.tsx` new
- `app/terms/page.tsx` new
- `proxy.ts`
- `infra/vps/minha-casa-db/docker-compose.yml` optional new

---

## Risks / Tradeoffs

- **Public VPS Postgres from Vercel:** workable, but less ideal than managed Postgres. Use TLS and strong credentials. Consider managed DB later.
- **Connection limits:** Vercel serverless can create bursts. Keep `DATABASE_POOL_MAX` low and monitor Postgres connections.
- **Existing subscription gate:** New users may be redirected to `/subscribe` after login depending on current subscription cookie rules. This is existing product behavior, not Google-specific.
- **Better Auth path:** With `app/api/auth/[...all]/route.ts`, Google redirect URI should be `/api/auth/callback/google`. Confirm during local smoke before Mark creates credentials.
- **Legal pages:** Initial content can be pragmatic placeholder, but should be reviewed before serious public launch.
- **DB reset:** Allowed for Minha Casa user DB if needed, but do not reset Todo Idle Quest DB.

---

## Recommended Execution Order

1. Implement DB driver switch and keep tests green.
2. Add Better Auth Google provider env/config.
3. Add Google buttons and tests.
4. Add legal pages and public route allowlist.
5. Provision VPS DB.
6. Run migrations against VPS DB.
7. Configure Vercel env without Google credentials first; deploy and test email/password.
8. Mark creates Google OAuth client using live `/privacy` and `/terms` URLs.
9. Add Google credentials to Vercel; redeploy and test Google login.
