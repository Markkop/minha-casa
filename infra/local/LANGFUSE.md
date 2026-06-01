# Langfuse (local)

Self-hosted Langfuse v3 for traces, prompt versions, and cost visibility.

**UI URL: http://localhost:3100** (not :3000 — that port is the Next.js app from `docker-compose.app.yml`).

## Start

```bash
# App stack (Postgres, MinIO, Phoenix, Hermes, Next)
docker compose -f infra/local/docker-compose.app.yml up -d

# Langfuse (ClickHouse, Redis, web UI on :3100)
docker compose -f infra/local/docker-compose.app.yml \
  -f infra/local/docker-compose.langfuse.yml up -d --remove-orphans
```

If ClickHouse stays unhealthy after an earlier failed start, reset its volume:

```bash
docker compose -f infra/local/docker-compose.app.yml \
  -f infra/local/docker-compose.langfuse.yml down
docker volume rm local_minha_casa_local_langfuse_clickhouse
# then `up -d` again
```

**Do not use `--remove-orphans`** unless you intend to stop the standalone DB on port 5434. With the default compose project name, it used to delete `minha-casa-local-db-1` while starting Langfuse. Compose files now use isolated project names (`minha-casa-app` vs `minha-casa-db`) so this should not happen again.

### Postgres / `ECONNREFUSED` on `pnpm dev`

Host Next.js reads `.env.local` → `DATABASE_URL`. If that points to `localhost:5434` but only the **app** stack is running, Postgres is on **`localhost:5435`** instead.

Either update `.env.local`:

```env
DATABASE_URL=postgresql://minhacasa:minhacasa_local_password@localhost:5435/minha_casa_local
```

Or start the standalone DB on 5434:

```bash
docker compose -f infra/local/docker-compose.db.yml up -d
```

### `relation "sessions" does not exist` (Better Auth / Drizzle)

After a **fresh** Postgres volume (or switching ports), the DB is empty. Apply Next.js schema, then Phoenix backend tables:

```bash
# From repo root — use the same host/port as DATABASE_URL in .env.local (5435 with app stack)
DATABASE_URL="postgresql://minhacasa:minhacasa_local_password@localhost:5435/minha_casa_local" \
  DATABASE_SSL=false pnpm db:migrate

# Phoenix (Oban, AI tables, listing_analyses) — same DB on 5435
docker compose -f infra/local/docker-compose.app.yml --env-file infra/local/.env.local \
  run --rm --no-deps phoenix-api /app/bin/minha_casa_ai eval 'MinhaCasaAi.Release.migrate()'
```

If Phoenix migrate stops on `whatsapp_link_codes already exists`, Drizzle already created those tables; mark the overlapping versions and re-run migrate (see repo history or ask in chat).

Set `BACKEND_DATABASE_URL` in `infra/local/.env.local` to `@host.docker.internal:5435` when using app Postgres, then recreate Phoenix: `docker rm -f minha-casa-phoenix-api-1` and `docker compose … up -d --no-deps phoenix-api`.

Restart `pnpm dev`, sign in again (old session cookies pointed at an empty DB).

### Wrong port / `lightningcss.linux-arm64-musl` on :3000

If you see a Next.js error about `globals.css` and `lightningcss` on **http://localhost:3000**, you opened the **minha-casa** app container, not Langfuse. Use **http://localhost:3100** for Langfuse.

For local UI dev, use **`pnpm dev:web` on the host** (`:5173`) or the `svelte-web` service from `infra/local/docker-compose.app.yml`. If native deps fail inside Alpine, recreate `svelte-web` after the compose `node_modules` volume fix so deps install inside the container.

Open **http://localhost:3100** and sign in with the **auto-created** local admin (only after a fresh Langfuse DB init):

| Field | Value |
|-------|--------|
| Email | `admin@example.com` |
| Password | `langfuse-local-admin` |

API keys for Phoenix (same as init): `pk-lf-local-minha-casa` / `sk-lf-local-minha-casa`

If login fails with "invalid credentials", the DB was created **before** `LANGFUSE_INIT_ORG_ID` was set (no user was seeded). Reset Langfuse data:

```bash
docker compose -f infra/local/docker-compose.app.yml \
  -f infra/local/docker-compose.langfuse.yml stop langfuse-web langfuse-worker

docker exec minha-casa-app-postgres-1 psql -U minhacasa -d postgres \
  -c "DROP DATABASE IF EXISTS langfuse; CREATE DATABASE langfuse;"

docker compose -f infra/local/docker-compose.app.yml \
  -f infra/local/docker-compose.langfuse.yml up -d langfuse-web langfuse-worker
```

Wait ~30s, then try the credentials above again. Alternatively use **Sign up** on the login page (works when the `users` table is empty).

Copy API keys into `infra/local/.env.local` (and root `.env` if Phoenix reads it via compose):

```env
LANGFUSE_HOST=http://langfuse-web:3000   # inside Docker for Phoenix
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_ENABLED=true
```

For **host** `pnpm dev` / Phoenix outside Docker, use `LANGFUSE_HOST=http://localhost:3100`.

## Sync prompts

From `backend/` (requires Elixir):

```bash
mix langfuse.sync_prompts          # writes priv/langfuse/prompts.snapshot.json
mix langfuse.sync_prompts --push   # also uploads to Langfuse (label production)
```

Prompts are defined in `backend/lib/minha_casa_ai/integrations/langfuse/prompt_definitions.ex`. Runtime uses Langfuse when enabled; otherwise the snapshot / definitions fallback applies.

## What gets traced

- Listing parse, saved-link metadata, WhatsApp/Telegram assistant (OpenAI Responses)
- Property analysis Hermes steps (`clima`, `riscos`, `mercado`, `ambientes`, `idade`, `xray:*`)

Production: see [`infra/vps/LANGFUSE.md`](../vps/LANGFUSE.md) and `infra/vps/docker-compose.langfuse.yml`.
