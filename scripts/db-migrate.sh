#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="${MINHA_CASA_COMPOSE_FILE:-infra/local/docker-compose.app.yml}"
ENV_FILE="${MINHA_CASA_ENV_FILE:-infra/local/.env.local}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and retry."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file not found: $ENV_FILE"
  echo "Copy infra/local/.env.local.example to infra/local/.env.local and configure it."
  exit 1
fi

echo "Rebuilding the Phoenix release used by the canonical Ecto migrator..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build phoenix-api

echo "Running Ecto migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
  run --rm --no-deps phoenix-api \
  /app/bin/minha_casa_ai eval 'MinhaCasaAi.Release.migrate()'
