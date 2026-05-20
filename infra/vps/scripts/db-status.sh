#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.prod}"
COMPOSE_FILE="infra/vps/docker-compose.db.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  echo "Copy infra/vps/.env.prod.example to .env.prod on the VPS and fill strong values." >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail=80 minha-casa-db
