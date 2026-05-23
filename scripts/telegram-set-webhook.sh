#!/usr/bin/env bash
set -euo pipefail

# Registers the Telegram webhook against production API_HOSTNAME.
# Usage (from repo root, with env loaded):
#   set -a && source .env.prod && set +a && ./scripts/telegram-set-webhook.sh

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "TELEGRAM_BOT_TOKEN is required" >&2
  exit 1
fi

if [[ -z "${API_HOSTNAME:-}" ]]; then
  echo "API_HOSTNAME is required (e.g. api.casas.example.com)" >&2
  exit 1
fi

if [[ -z "${TELEGRAM_WEBHOOK_SECRET:-}" ]]; then
  echo "TELEGRAM_WEBHOOK_SECRET is required" >&2
  exit 1
fi

WEBHOOK_URL="https://${API_HOSTNAME}/webhooks/telegram"

echo "Setting webhook to ${WEBHOOK_URL}"

response=$(curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${WEBHOOK_URL}" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}")

echo "${response}"

echo ""
echo "Webhook info:"
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || \
  curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
