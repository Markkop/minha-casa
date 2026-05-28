# VPS Stack for Minha Casa

Minha Casa now runs the database plus the Elixir AI backend on the VPS. The stack keeps the same operational style: Docker Compose, `.env.prod`, health checks, and small debug scripts.

## Files

- `infra/vps/docker-compose.db.yml` — Postgres 17, Phoenix AI backend, and MinIO.
- `infra/vps/.env.prod.example` — safe template for the VPS `.env.prod`.
- `infra/vps/scripts/generate-postgres-tls.sh` — creates local cert/key for Postgres TLS.
- `infra/vps/scripts/db-status.sh` — shows Compose status and recent DB logs.
- `infra/vps/scripts/db-smoke-test.sh` — runs a read-only `select version(), now();` check.

## First deploy on the VPS

Local access uses `.ssh-prod` at the repo root, ignored by git:

```text
user@host
password
```

Use it without printing the password:

```bash
VPS_TARGET="$(sed -n '1p' .ssh-prod)"
VPS_PASSWORD="$(sed -n '2p' .ssh-prod)"
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_TARGET" "hostname"
```

```bash
cd /docker/minha-casa
cp infra/vps/.env.prod.example .env.prod
openssl rand -base64 36 # paste into POSTGRES_PASSWORD in .env.prod
chmod +x infra/vps/scripts/*.sh
./infra/vps/scripts/generate-postgres-tls.sh
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod up -d
./infra/vps/scripts/db-smoke-test.sh
```

The VPS uses the shared `/docker/caddy` stack. Add host blocks there, not a second Caddy container:

```caddyfile
api.casas.markkop.dev {
  reverse_proxy phoenix-api:4000
}

s3.casas.markkop.dev {
  reverse_proxy minio:9000
}

minio.casas.markkop.dev {
  reverse_proxy minio:9001
}
```

Run Phoenix migrations after the first backend deploy:

```bash
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod exec phoenix-api \
  /app/bin/minha_casa_ai eval "MinhaCasaAi.Release.migrate()"
```

## Data model note

All app tables (listings, `saved_links`, auth, etc.) live in this Postgres instance. Drizzle (Next.js) and Ecto (Phoenix) are ORMs over the same database.

## Frontend env vars

Set these wherever the Next.js frontend runs:

```env
DATABASE_URL=postgresql://minhacasa:<POSTGRES_PASSWORD>@<VPS_HOST>:5433/minha_casa_prod
DATABASE_SSL=true
DATABASE_POOL_MAX=5
BETTER_AUTH_URL=https://<minha-casa-domain>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_TRUSTED_ORIGINS=https://<minha-casa-domain>,http://localhost:3000
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
INTERNAL_BACKEND_URL=https://<api-domain>
BACKEND_API_URL=https://<api-domain>
INTERNAL_API_SECRET=<same value as VPS .env.prod>
```

Also keep the existing production values for OpenAI, ScrapingAnt, Brave Search, Google Maps, Stripe and share links. OpenAI, ScrapingAnt, and Brave Search should be available to Phoenix on the VPS. The Next.js app proxies `/api/parse` and workspace saved-links to Phoenix in production.

### Langfuse (optional)

Self-hosted on the VPS. See [infra/vps/LANGFUSE.md](../infra/vps/LANGFUSE.md).

```env
LANGFUSE_BASE_URL=https://langfuse.casas.markkop.dev
LANGFUSE_PUBLIC_KEY=<from Langfuse project settings>
LANGFUSE_SECRET_KEY=<from Langfuse project settings>
LANGFUSE_ENABLED=true
LANGFUSE_ENV=production
LANGFUSE_PROMPT_LABEL=production
```

Phoenix on the VPS uses `LANGFUSE_HOST=http://langfuse-web:3000` in `.env.prod` (not the public URL).

```env
SCRAPINGANT_API_KEY=<from ScrapingAnt dashboard>
```

**Production domain (example):** `https://casas.markkop.dev` — use your real hostname in Google OAuth and in `BETTER_AUTH_*` / `NEXT_PUBLIC_APP_URL`.

### Running `pnpm db:migrate` from your laptop (self-signed TLS)

The app uses a self-signed certificate on the VPS. For **local migration**, use `DATABASE_SSL=true` and put **no** `sslmode` in the URL so Drizzle’s TLS config (`rejectUnauthorized: false`) applies:

```env
DATABASE_URL="postgresql://minhacasa:<password>@<VPS_HOST>:5433/minha_casa_prod"
DATABASE_SSL="true"
```

For a remotely hosted frontend such as Vercel, use the same pattern: **no** `sslmode` in `DATABASE_URL`, only `DATABASE_SSL=true`. Node `pg` treats `sslmode=require` as strict certificate verification, which breaks the VPS self-signed cert even when `rejectUnauthorized: false` is set in code.

## Google OAuth Console

Use Web Application credentials:

- Authorized JavaScript origins:
  - `https://<minha-casa-domain>`
  - `http://localhost:3000`
- Authorized redirect URIs:
  - `https://<minha-casa-domain>/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google`
- Consent screen links:
  - Homepage: `https://<minha-casa-domain>`
  - Privacy: `https://<minha-casa-domain>/privacy`
  - Terms: `https://<minha-casa-domain>/terms`

## Operations

```bash
# Status and recent logs
./infra/vps/scripts/db-status.sh

# Read-only DB check
./infra/vps/scripts/db-smoke-test.sh

# Restart DB only, preserving volume
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod restart minha-casa-db

# Restart Phoenix only
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod restart phoenix-api
```

Do not run `docker compose down -v` or `docker volume prune` unless you explicitly intend to delete the Minha Casa database volume.

## Notes

- This setup still exposes Postgres publicly for the current frontend/API routes. Once all server routes move to Phoenix or the frontend moves to the VPS, Postgres can be made private to the Docker network.
- The shared Caddy exposes Phoenix and MinIO over HTTPS. Keep MinIO console protected by a strong password and restrict it further at the firewall if possible.
