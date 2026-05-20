# Stripe live (production) — Minha Casa

This summarizes what was configured for **live-mode** Stripe and what you still need to verify manually.

## Live catalog

| Stripe object | ID |
|---------------|-----|
| Product `Minha Casa Plus` | `prod_UYL24Gsozhqk5I` |
| Price BRL R$20 / month recurring | `price_1TZEMxBysq497srN7Bj6rFu6` |

## Webhook

- Endpoint URL: `https://casas.markkop.dev/api/webhooks/stripe`
- Signing secret stored in **Vercel Production** as `STRIPE_WEBHOOK_SECRET` (`we_…` endpoint `Minha Casa production subscriptions`).
- Ensure these events are enabled (Stripe Dashboard → Developers → Webhooks):

  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

## Vercel Production env

Already expected on the deployment:

- `STRIPE_SECRET_KEY` — **live** secret key (starts with `sk_live_`; rotate periodically).
- `STRIPE_WEBHOOK_SECRET` — **live** `whsec_` for the endpoint above (rotate if you regenerate the webhook).
- `NEXT_PUBLIC_APP_URL=https://casas.markkop.dev`

Redeploy after changing env vars so the deployment picks them up.

## Postgres: map Plus plan to Stripe price

The Plus row (`plans.slug = 'plus'`) must have `stripe_price_id` Set to the **live** `price_…` ID.

**Option A — script**

```bash
cd /path/to/minha-casa
DATABASE_URL='postgresql://…' DATABASE_SSL=true pnpm run db:set-plus-stripe-live
```

**Option B — admin API**

`PATCH /api/admin/plans/plus` (admin session required):

```json
{ "stripePriceId": "price_1TZEMxBysq497srN7Bj6rFu6" }
```

## Customer Billing Portal

1. Stripe Dashboard → **Settings → Billing → Customer portal** — configure products, cancellation behaviour, branding.
2. In the app: `/subscribe` shows **Gerenciar cobranca e cartao no Stripe** for subscriptions that include `stripeSubscriptionId`; it calls `POST /api/billing/portal`.

## Admin cancellation + Stripe

`PATCH /api/admin/subscriptions/:id` accepts:

- `{ "status": "cancelled", "cancelImmediately": false }` (default behaviour from the UI) → cancels **at period end** in Stripe and mirrors `cancel_at_period_end` / Stripe status on the subscription row without forcing local `cancelled` until Stripe finalizes access.
- `{ "status": "cancelled", "cancelImmediately": true }` → immediate cancel in Stripe and local row becomes `cancelled`.

## Operational smoke test

1. Redeploy production on Vercel.
2. As a logged-in non-admin user, open `/subscribe` — test-mode banner must be **hidden** (`sk_live_` on prod).
3. Complete a minimal live checkout on Plus — confirm webhook 2xx and `/api/subscriptions` shows active.
4. As admin, GET `/api/admin/stripe/reconciliation` — review `missingLocally` / `staleStatus`.

## Account checklist (Stripe Dashboard)

Confirm **live** onboarding: business verification, Brazil / BRL payouts, acceptable payment methods, and Billing Portal branding. MCP/CLI automation cannot validate legal/compliance readiness.
