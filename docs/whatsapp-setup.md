# WhatsApp Cloud API setup (Minha Casa)

This guide covers Meta configuration and environment variables for the gated WhatsApp bot (connect account first, then AI parsing).

## Architecture

1. User messages the business number on WhatsApp.
2. If not linked: bot replies with a **predefined** message and link to `/conectar-whatsapp?wa=CODE` (no OpenAI).
3. User logs in or signs up on the website and completes linking.
4. Linked users can send text, URLs, images, or PDFs; Phoenix runs `ListingParser` and replies on WhatsApp.

Webhook endpoint: `https://<API_HOSTNAME>/webhooks/whatsapp`

## Meta Developer Console

1. Add the **WhatsApp** product to your app (Catalog API is optional and not required for this bot).
2. Complete **Business verification** in Business Manager (often ~48 hours).
3. **API Setup** (App → WhatsApp → API Setup):
   - Note **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - Generate a **System User** permanent token → `WHATSAPP_ACCESS_TOKEN`
   - Permissions: `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`
4. **Configuration** (webhooks):
   - Callback URL: `https://<API_HOSTNAME>/webhooks/whatsapp`
   - Verify token: same value as `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to **messages**
5. **App Secret** (App → Settings → Basic) → `WHATSAPP_APP_SECRET` (validates `X-Hub-Signature-256` on POST).
6. Add a **payment method** on the business account for production messaging limits.

### Test number (before SIM)

Meta provides a test WABA and test phone number in API Setup. Use those credentials locally to verify webhooks and linking without a physical chip.

### Production number (when SIM is ready)

1. Add the number in API Setup or WhatsApp Manager.
2. Verify via SMS/voice OTP.
3. Register for Cloud API: `POST /v23.0/{PHONE_NUMBER_ID}/register` with `messaging_product=whatsapp` and a 6-digit `pin`.
4. Update `WHATSAPP_PHONE_NUMBER_ID` on the VPS.

## Environment variables

### Phoenix (VPS / Docker)

| Variable | Description |
|----------|-------------|
| `WHATSAPP_VERIFY_TOKEN` | Random string; must match Meta webhook verify token |
| `WHATSAPP_ACCESS_TOKEN` | System User permanent token |
| `WHATSAPP_PHONE_NUMBER_ID` | Business phone number ID from API Setup |
| `WHATSAPP_APP_SECRET` | Meta app secret for webhook signature validation |
| `APP_PUBLIC_URL` | Public site URL for link messages (e.g. `https://app.example.com`) |
| `API_HOSTNAME` | Caddy hostname for Phoenix (webhook base URL) |

### Next.js

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Same as public app URL (used if `APP_PUBLIC_URL` is unset on Phoenix) |
| `INTERNAL_BACKEND_URL` | Phoenix base URL for `/api/integrations/whatsapp/*` proxy |
| `INTERNAL_API_SECRET` | Shared secret for Phoenix internal routes |

## Local testing

1. Run migrations: Drizzle `0007_whatsapp_linking.sql` and Phoenix `20260523120000_create_whatsapp_linking_tables`.
2. Set env vars in `infra/local/.env.local` (see `.env.local.example`).
3. Expose Phoenix with a tunnel (e.g. ngrok) if testing Meta webhooks locally.
4. Message the test number → open the link → log in → confirm “WhatsApp conectado”.
5. Send a listing URL or text → bot should reply with parse summary (requires `OPENAI_API_KEY`).

Without `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`, outbound messages are **logged** (dry-run) but not sent to Meta.

## User-facing flow

- Connect page: `/conectar-whatsapp?wa=CODE`
- API: `POST /api/integrations/whatsapp/link` (session required)
- Status: `GET /api/integrations/whatsapp`

## Security

- Link codes expire in 30 minutes and are single-use.
- One WhatsApp `wa_id` can only link to one minha-casa user.
- Never expose `WHATSAPP_ACCESS_TOKEN` in the browser.

## Related code

- Webhook: `backend/lib/minha_casa_ai_web/controllers/whats_app_webhook_controller.ex`
- Router (onboarding vs AI): `backend/lib/minha_casa_ai/whatsapp/router.ex`
- Channel agent: `backend/lib/minha_casa_ai/channel/agent.ex`
- Connect UI: `app/conectar-whatsapp/`
