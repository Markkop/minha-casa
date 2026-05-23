# Telegram Bot setup (Minha Casa)

Gated onboarding mirrors WhatsApp: predefined replies until the user links their minha-casa account, then AI parsing via `ListingParser`.

## Security

- Store `TELEGRAM_BOT_TOKEN` only in gitignored env files (`.env.local`, VPS `.env.prod`).
- Do **not** commit the bot token to the repository.
- If the token was exposed, rotate it via [@BotFather](https://t.me/BotFather) (`/revoke` then `/newbot` or regenerate token).

## BotFather

1. Create a bot with [@BotFather](https://t.me/BotFather) (`/newbot`).
2. Copy the HTTP API token into `TELEGRAM_BOT_TOKEN`.
3. Generate a webhook secret (e.g. `openssl rand -hex 16`) → `TELEGRAM_WEBHOOK_SECRET`.

## Environment variables

### Phoenix (VPS / Docker)

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Random string; sent in `X-Telegram-Bot-Api-Secret-Token` |
| `APP_PUBLIC_URL` | Public site URL for connect links |
| `API_HOSTNAME` | Caddy hostname for Phoenix (webhook base) |

### Next.js

| Variable | Description |
|----------|-------------|
| `INTERNAL_BACKEND_URL` | Phoenix base URL |
| `INTERNAL_API_SECRET` | Shared internal auth secret |
| `NEXT_PUBLIC_APP_URL` | Fallback for `APP_PUBLIC_URL` on Phoenix |

## Database migrations

Apply both:

- Drizzle: `drizzle/migrations/0008_telegram_linking.sql`
- Phoenix: `20260523130000_create_telegram_linking_tables.exs`

## Register webhook (production)

After deploy, with env loaded on the VPS or locally pointing at prod:

```bash
chmod +x scripts/telegram-set-webhook.sh
set -a && source .env.prod && set +a
./scripts/telegram-set-webhook.sh
```

Webhook URL: `https://<API_HOSTNAME>/webhooks/telegram`

Verify token works:

```bash
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

## User flow

1. User DMs the bot → welcome message + link `/conectar-telegram?tg=CODE`.
2. User logs in or signs up on the website.
3. Page calls `POST /api/integrations/telegram/link`.
4. Bot sends “Conta conectada”.
5. User sends text, URL, image, or PDF → “Analisando…” → parse summary.

## Manual test checklist

1. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` on VPS; restart `phoenix-api`.
2. Run migrations.
3. Run `scripts/telegram-set-webhook.sh`.
4. Message the bot in a **private chat** (groups are ignored in v1).
5. Open the link, log in, confirm connection.
6. Send a listing URL and confirm the summary reply.

Without `TELEGRAM_BOT_TOKEN`, outbound messages are logged as dry-run in Phoenix logs.

## Related code

- Webhook: `backend/lib/minha_casa_ai_web/controllers/telegram_webhook_controller.ex`
- Router: `backend/lib/minha_casa_ai/telegram/router.ex`
- Agent: `backend/lib/minha_casa_ai/channel/agent.ex`
- Connect UI: `app/conectar-telegram/`
