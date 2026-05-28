# Langfuse (production VPS)

Self-hosted Langfuse v3 for prompt versions, traces, and cost visibility.

**UI:** `https://langfuse.casas.markkop.dev` (Caddy → `langfuse-web:3000`)

## Deploy / update

```bash
cd /docker/minha-casa
git pull

# Ensure .env.prod has LANGFUSE_* (see .env.prod.example), then:
docker compose -f infra/vps/docker-compose.db.yml \
  -f infra/vps/docker-compose.langfuse.yml --env-file .env.prod up -d --build

# Rebuild Phoenix when backend tracing code changes:
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod up -d --build phoenix-api
```

Add to `/docker/caddy/Caddyfile` (once):

```caddyfile
langfuse.casas.markkop.dev {
  reverse_proxy langfuse-web:3000
}
```

Reload Caddy: `docker exec caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile`

## First-time secrets

On the VPS, generate and paste into `.env.prod`:

```bash
openssl rand -base64 32   # LANGFUSE_NEXTAUTH_SECRET
openssl rand -base64 32   # LANGFUSE_SALT
openssl rand -hex 32      # LANGFUSE_ENCRYPTION_KEY (64 hex chars)
openssl rand -base64 24   # LANGFUSE_CLICKHOUSE_PASSWORD
openssl rand -base64 24   # LANGFUSE_REDIS_PASSWORD
```

`LANGFUSE_INIT_*` seeds the first org, project, API keys, and admin user **only on a fresh Langfuse DB**. To re-seed, drop the `langfuse` database and recreate the stack.

## Sync prompts

After API keys are in `.env.prod` and Phoenix has `LANGFUSE_ENABLED=true`:

```bash
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod run --rm --no-deps phoenix-api \
  /app/bin/minha_casa_ai eval 'Mix.Task.run("langfuse.sync_prompts", ["--push"])'
```

(Or run `mix langfuse.sync_prompts --push` from a release shell with the same env.)

## App env

| Where | `LANGFUSE_HOST` / `LANGFUSE_BASE_URL` | Notes |
|-------|--------------------------------------|--------|
| Phoenix (Docker) | `http://langfuse-web:3000` | Internal network |
| Vercel / Next.js | `https://langfuse.casas.markkop.dev` | Use `LANGFUSE_BASE_URL` in Vercel |

Set `LANGFUSE_ENABLED=true` only after project API keys are configured.
