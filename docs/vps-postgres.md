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

## Updating the VPS

The production checkout lives at `/docker/minha-casa`. The shared Caddy stack lives outside this repo at `/docker/caddy`; update `/docker/caddy/Caddyfile` for public host routing instead of adding another Caddy service to this Compose file.

Before pulling, check whether production is behind by more than the commit you are deploying:

```bash
cd /docker/minha-casa
git status --short --branch
git fetch origin main
git log --oneline HEAD..origin/main
```

Deploy Phoenix backend changes with a rebuild, migration, recreate, and health check:

```bash
cd /docker/minha-casa
git pull --ff-only origin main

docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod build phoenix-api

docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod run --rm --no-deps phoenix-api \
  /app/bin/minha_casa_ai eval "MinhaCasaAi.Release.migrate()"

docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod up -d --no-deps --force-recreate phoenix-api

docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod ps phoenix-api
docker inspect -f "{{.State.Health.Status}}" minha-casa-phoenix-api-1
docker logs --tail=80 minha-casa-phoenix-api-1
```

For public API smoke checks, use the production API host configured in Caddy, currently `https://api.casas.markkop.dev`.

## Data model note

All app tables—including Better Auth tables—live in this Postgres instance and
are owned by the Ecto migration history in `backend/priv/repo/migrations`.
Phoenix's release migrator is the only supported schema-change path.

Verify the migration history after a deploy:

```bash
docker exec -i minha-casa-db-1 sh -lc 'cat > /tmp/check-migrations.sql && psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/check-migrations.sql' <<SQL
SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;
SQL
```

## Frontend env vars

Set these wherever the SvelteKit frontend runs:

```env
DATABASE_URL=postgresql://minhacasa:<POSTGRES_PASSWORD>@<VPS_HOST>:5433/minha_casa_prod
DATABASE_SSL=true
DATABASE_POOL_MAX=5
BETTER_AUTH_URL=https://<minha-casa-domain>
PUBLIC_APP_URL=https://<minha-casa-domain>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_TRUSTED_ORIGINS=https://<minha-casa-domain>,http://localhost:5173
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
PUBLIC_API_URL=https://<api-domain>
PHOENIX_API_URL=https://<api-domain>
INTERNAL_API_SECRET=<same value as VPS .env.prod>
```

Also keep the existing production values for OpenAI, ScrapingAnt, Brave Search, Google Maps, and share links. OpenAI, ScrapingAnt, and Brave Search should be available to Phoenix on the VPS.

**Stripe (billing):** set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in VPS `.env.prod` and wire them into `phoenix-api` in `infra/vps/docker-compose.db.yml`. Restricted keys (`rk_live_...`) work as drop-in replacements for secret keys. The Svelte app on Vercel does **not** need Stripe env vars — it proxies billing to Phoenix.

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

**Production domain (example):** `https://casas.markkop.dev` — use your real hostname in Google OAuth and in `BETTER_AUTH_*` / `PUBLIC_APP_URL`.

Do not run migrations from the frontend host or a developer laptop against
production. Build the Phoenix release on the VPS, take a database backup, and
run `MinhaCasaAi.Release.migrate()` there as shown above.

## Google OAuth Console

Use Web Application credentials:

- Authorized JavaScript origins:
  - `https://<minha-casa-domain>`
  - `http://localhost:5173`
- Authorized redirect URIs:
  - `https://<minha-casa-domain>/api/auth/callback/google`
  - `http://localhost:5173/api/auth/callback/google`
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
