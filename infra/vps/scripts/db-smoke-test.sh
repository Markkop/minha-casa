#!/usr/bin/env sh
set -eu

# Default must be ./.env.prod — plain .env.prod breaks under dash (. .env.prod is misparsed).
ENV_FILE="${1:-./.env.prod}"
COMPOSE_FILE="infra/vps/docker-compose.db.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$ENV_FILE"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec minha-casa-db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'select version(), now();'
