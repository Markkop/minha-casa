#!/usr/bin/env bash
# Applies listing_analyses migration and restarts Phoenix with the correct DB (port 5434).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_CONTAINER="${DB_CONTAINER:-minha-casa-local-db-1}"
MIGRATION="$ROOT/drizzle/migrations/0010_listing_analyses.sql"
COMPOSE_DIR="$ROOT/infra/local"
ENV_FILE="$COMPOSE_DIR/.env"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "Postgres container '${DB_CONTAINER}' is not running."
  echo "Start the local DB stack first:"
  echo "  docker compose -f infra/local/docker-compose.db.yml up -d"
  exit 1
fi

echo "Applying listing_analyses migration on ${DB_CONTAINER}..."
docker exec -i "$DB_CONTAINER" psql -U minhacasa -d minha_casa_local < "$MIGRATION"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating ${ENV_FILE} (Phoenix → host Postgres on 5434)..."
  cat > "$ENV_FILE" <<'EOF'
BACKEND_DATABASE_URL=postgresql://minhacasa:minhacasa_local_password@host.docker.internal:5434/minha_casa_local
INTERNAL_API_SECRET=local-internal-api-secret
EOF
fi

echo "Rebuilding and restarting Phoenix API..."
COMPOSE_ENV=(--env-file "$ENV_FILE")
[[ -f "$ROOT/.env" ]] && COMPOSE_ENV+=(--env-file "$ROOT/.env")
[[ -f "$ROOT/.env.local" ]] && COMPOSE_ENV+=(--env-file "$ROOT/.env.local")
docker compose -f "$COMPOSE_DIR/docker-compose.app.yml" "${COMPOSE_ENV[@]}" up -d phoenix-api --force-recreate

echo "Checking API keys inside Phoenix (set = ok, empty = fix .env / .env.local)..."
docker exec minha-casa-phoenix-api-1 sh -c '
  test -n "$OPENAI_API_KEY" && echo "  OPENAI_API_KEY: set" || echo "  OPENAI_API_KEY: MISSING (add to .env)"
  test -n "$GOOGLE_MAPS_SERVER_API_KEY$PUBLIC_GOOGLE_MAPS_API_KEY" && echo "  Google Maps: set" || echo "  Google Maps: MISSING"
  test -n "$BRAVE_SEARCH_API_KEY" && echo "  BRAVE_SEARCH_API_KEY: set" || echo "  BRAVE_SEARCH_API_KEY: optional"
'

echo "Waiting for Phoenix health..."
for _ in $(seq 1 30); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    echo "Phoenix is healthy."
    echo ""
    echo "Ensure repo root has:"
    echo "  .env — OPENAI_API_KEY=..."
    echo "  .env.local — PUBLIC_GOOGLE_MAPS_API_KEY=... (Geocoding + Places enabled)"
    echo "  .env.local — DATABASE_URL=...@localhost:5434/..., INTERNAL_BACKEND_URL=http://localhost:4000"
    echo ""
    echo "Re-run deep analysis on /analise after keys are loaded."
    exit 0
  fi
  sleep 2
done

echo "Phoenix did not become healthy in time. Check: docker logs minha-casa-phoenix-api-1"
exit 1
