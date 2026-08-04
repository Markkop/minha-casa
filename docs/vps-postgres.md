# VPS Stack for Minha Casa

Minha Casa is fully self-hosted on the VPS: Postgres, the Elixir AI backend, MinIO, Langfuse, and the SvelteKit frontend all run there as Docker Compose services, routed by [Dokploy](https://dokploy.com)'s Traefik instance via Docker labels. There is no external PaaS (Vercel) or reverse proxy (Caddy) in the loop anymore.

## Files

- `infra/vps/docker-compose.db.yml` — Postgres 17, Phoenix AI backend, MinIO, and the Hermes analysis agent.
- `infra/vps/docker-compose.web.yml` — the SvelteKit frontend (`apps/web`, built with `@sveltejs/adapter-node`).
- `infra/vps/docker-compose.langfuse.yml` — self-hosted Langfuse (see [infra/vps/LANGFUSE.md](../infra/vps/LANGFUSE.md)).
- `infra/vps/.env.prod.example` — safe template for the VPS `.env.prod`.
- `infra/vps/scripts/generate-postgres-tls.sh` — creates local cert/key for Postgres TLS.
- `infra/vps/scripts/db-status.sh` — shows Compose status and recent DB logs.
- `infra/vps/scripts/db-smoke-test.sh` — runs a read-only `select version(), now();` check.
- `.forgejo/workflows/deploy.yml` — CI/CD: builds `phoenix-api` and `web` images, pushes them to the self-hosted Forgejo registry, then triggers the VPS deploy over SSH.

## Routing and TLS

All public routing and TLS termination is handled by **Dokploy's Traefik** (Docker Swarm, network `dokploy-network`), driven entirely by `traefik.*` labels already present on each service in the compose files above. There is nothing to configure manually per host — adding a new public route means adding labels to a service and attaching it to `dokploy-network`, not editing a shared proxy config file. Dokploy's own dashboard is at `https://dokploy.markkop.dev`.

## CI/CD (Forgejo Actions)

Git hosting, the container registry, and CI/CD are self-hosted on Forgejo at `https://git.markkop.dev`. The flow for both `minha-casa` and `todo-idle-quest`:

1. Push to `main` on GitHub (still the primary remote for now).
2. Forgejo mirrors the repo (`git.markkop.dev/markkop/minha-casa`, pull-mirror synced every ~10 minutes, or manually via `POST /api/v1/repos/markkop/minha-casa/mirror-sync`).
3. The mirror sync triggers `.forgejo/workflows/deploy.yml` on the self-hosted Forgejo runner:
   - `build-and-push`: builds `phoenix-api` (from `backend/Dockerfile`) and `web` (from `apps/web/Dockerfile.prod`), tags them `latest` + the commit SHA, and pushes to `git.markkop.dev/markkop/minha-casa-{phoenix-api,web}`.
   - `deploy`: SSHes into the VPS with a restricted deploy key (forced command, see below) and runs `docker compose pull && up -d` for those two services.

**The restricted deploy key:** the VPS root account has an SSH key (stored as the `DEPLOY_SSH_KEY` secret on both Forgejo repos) that can *only* run `/usr/local/bin/ci-deploy.sh` (`no-pty`, no port/agent forwarding). That script accepts `deploy minha-casa` or `deploy todo-idle-quest` via `$SSH_ORIGINAL_COMMAND` and runs the matching `docker compose pull && up -d`. It has no other capability.

**Important — this does not run migrations.** CI only pulls the new image and recreates the container. After any deploy that includes an Ecto migration, run it manually (see below).

**Caveat — infra changes need a manual sync.** `/docker/minha-casa` on the VPS is a git checkout used only to hold the compose files and `.env.prod` (not rebuilt by CI). If you change a compose file (new service, new Traefik label, etc.), copy it to the VPS explicitly — CI does not currently sync infra files, only application images:

```bash
scp infra/vps/docker-compose.db.yml infra/vps/docker-compose.web.yml \
  root@<VPS_HOST>:/docker/minha-casa/infra/vps/
```

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
docker compose -f infra/vps/docker-compose.db.yml -f infra/vps/docker-compose.web.yml --env-file .env.prod up -d
./infra/vps/scripts/db-smoke-test.sh
```

Run Phoenix migrations after the first backend deploy:

```bash
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod exec phoenix-api \
  /app/bin/minha_casa_ai eval "MinhaCasaAi.Release.migrate()"
```

## Updating the VPS

**Normal path:** push to `main` on GitHub. CI/CD (above) builds, pushes, and redeploys `phoenix-api` and `web` automatically within a few minutes. If your change includes a migration, run it manually right after the deploy finishes (command above).

**Manual/fallback path** (useful for debugging CI, or deploying without waiting for the pipeline): the production checkout still lives at `/docker/minha-casa` for holding compose files and `.env.prod`.

```bash
cd /docker/minha-casa/infra/vps
docker compose -f docker-compose.db.yml -f docker-compose.web.yml --env-file /docker/minha-casa/.env.prod build phoenix-api web

docker compose -f docker-compose.db.yml -f docker-compose.web.yml --env-file /docker/minha-casa/.env.prod run --rm --no-deps phoenix-api \
  /app/bin/minha_casa_ai eval "MinhaCasaAi.Release.migrate()"

docker compose -f docker-compose.db.yml -f docker-compose.web.yml --env-file /docker/minha-casa/.env.prod up -d --no-deps --force-recreate phoenix-api web

docker compose -f docker-compose.db.yml -f docker-compose.web.yml --env-file /docker/minha-casa/.env.prod ps phoenix-api web
docker inspect -f "{{.State.Health.Status}}" minha-casa-phoenix-api-1
docker inspect -f "{{.State.Health.Status}}" minha-casa-web-1
docker logs --tail=80 minha-casa-phoenix-api-1
```

For public API smoke checks, use `https://api.casas.markkop.dev`.

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

## Frontend

The SvelteKit frontend (`apps/web`) is self-hosted on the VPS via `infra/vps/docker-compose.web.yml`, built from `apps/web/Dockerfile.prod` (`@sveltejs/adapter-node`). All of its env vars live in the same VPS `.env.prod` as the rest of the stack — see `infra/vps/.env.prod.example` for the full list (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `PUBLIC_GOOGLE_MAPS_API_KEY`, `WEB_HOSTNAME`, etc.). It talks to `phoenix-api` and Postgres over the internal Docker network (`minha_casa_internal`), not over the public internet.

Also keep the existing production values for OpenAI, ScrapingAnt, Brave Search, Google Maps, and share links — these are only needed by `phoenix-api`, not the frontend.

**Stripe (billing):** set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in VPS `.env.prod` and wire them into `phoenix-api` in `infra/vps/docker-compose.db.yml`. Restricted keys (`rk_live_...`) work as drop-in replacements for secret keys. The frontend proxies billing to Phoenix and does not need Stripe env vars itself.

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

Phoenix on the VPS uses `LANGFUSE_HOST=http://langfuse-web:3000` in `.env.prod` (not the public URL). Langfuse is only used by the backend — the frontend has no Langfuse integration.

```env
SCRAPINGANT_API_KEY=<from ScrapingAnt dashboard>
```

**Production domain:** `https://casas.markkop.dev` — used in Google OAuth and in `BETTER_AUTH_*` / `WEB_HOSTNAME`.

Do not run migrations from a developer laptop against production. Build/deploy the Phoenix release on the VPS (via CI or the manual path above), take a database backup, and run `MinhaCasaAi.Release.migrate()` there as shown above.

## Google OAuth Console

Use Web Application credentials:

- Authorized JavaScript origins:
  - `https://casas.markkop.dev`
  - `http://localhost:5173`
- Authorized redirect URIs:
  - `https://casas.markkop.dev/api/auth/callback/google`
  - `http://localhost:5173/api/auth/callback/google`
- Consent screen links:
  - Homepage: `https://casas.markkop.dev`
  - Privacy: `https://casas.markkop.dev/privacy`
  - Terms: `https://casas.markkop.dev/terms`

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

# Restart the frontend only
docker compose -f infra/vps/docker-compose.web.yml --env-file .env.prod restart web
```

Do not run `docker compose down -v` or `docker volume prune` unless you explicitly intend to delete the Minha Casa database volume.

## Notes

- Postgres is still exposed on the public port (`POSTGRES_PUBLIC_PORT`, default `5433`) for direct developer/admin access. The app itself (Phoenix and the frontend) talks to Postgres over the internal Docker network only, so this port can be firewalled off or removed if external DB access is no longer needed.
- Keep the MinIO console (`minio.casas.markkop.dev`) protected by a strong password and restrict it further at the firewall if possible.
