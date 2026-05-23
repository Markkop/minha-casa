# Minha Casa AI Backend

Phoenix/Elixir backend for AI ingestion, workflows, chat, WhatsApp webhooks, MCP tools, and file attachments.

## Local Docker

Use the repository-level Compose file:

```bash
docker compose -f infra/local/docker-compose.app.yml --env-file .env.local up
```

The backend is available at `http://localhost:4000`.

The backend boots without optional credentials. Feature endpoints return clear `503`/feature errors when `OPENAI_API_KEY`, `SCRAPINGANT_API_KEY`, `MINIO_*`, or `WHATSAPP_*` are absent.

## Migrations

Run migrations inside the backend container:

```bash
docker compose -f infra/local/docker-compose.app.yml exec phoenix-api /app/bin/minha_casa_ai eval "MinhaCasaAi.Release.migrate()"
```

## Key Endpoints

- `GET /health`
- `POST /api/parse`
- `POST /api/workflows/ingestions`
- `GET /api/workflows/:id`
- `POST /api/chat/messages`
- `GET|POST /webhooks/whatsapp` (gated onboarding + linked AI replies; see [docs/whatsapp-setup.md](../docs/whatsapp-setup.md))
- `POST /webhooks/telegram` (same flow; see [docs/telegram-setup.md](../docs/telegram-setup.md))
- `POST /api/whatsapp/link`, `GET /api/whatsapp/status` (internal; account linking)
- `POST /api/telegram/link`, `GET /api/telegram/status` (internal; account linking)
- `POST /mcp`
