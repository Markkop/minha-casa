# Langfuse (production VPS)

Self-hosted Langfuse v3 for prompt versions, traces, and cost visibility.

**UI:** `https://langfuse.casas.markkop.dev` (routed by Dokploy's Traefik → `langfuse-web:3000`, via Docker labels already on the `langfuse-web` service — nothing to configure manually)

## Deploy / update

```bash
cd /docker/minha-casa

# Ensure .env.prod has LANGFUSE_* (see .env.prod.example), then:
docker compose -f infra/vps/docker-compose.db.yml \
  -f infra/vps/docker-compose.langfuse.yml --env-file .env.prod up -d

# Rebuild Phoenix when backend tracing code changes:
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod up -d --build phoenix-api
```

(Compose file changes need to be copied to the VPS manually — see the "CI/CD" and "Caveat" sections in [docs/vps-postgres.md](../../docs/vps-postgres.md).)

### DNS (required)

Add an **A** record for `langfuse` pointing at the VPS IP, wherever `markkop.dev` DNS is managed (same as the `api` / `s3` / `minio` / `casas` subdomains).

| Type | Name | Value |
|------|------|--------|
| A | `langfuse` | `72.61.75.8` |

Until this exists, the browser shows `DNS_PROBE_FINISHED_NXDOMAIN` even when Langfuse is healthy on the VPS.

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

Langfuse is only used by the Phoenix backend — the SvelteKit frontend has no Langfuse integration.

| Where | `LANGFUSE_HOST` | Notes |
|-------|------------------|--------|
| Phoenix (`.env.prod` on the VPS) | `http://langfuse-web:3000` | Internal Docker network |

Set `LANGFUSE_ENABLED=true` only after project API keys are configured.
