#!/usr/bin/env bash
# Start local Phoenix API + MinIO (uses Postgres on host :5434 — same as `pnpm dev`).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and retry."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q 'minha-casa-local-db-1'; then
  echo "Starting local Postgres (port 5434)..."
  docker compose -f infra/local/docker-compose.db.yml --env-file infra/local/.env.local up -d
fi

echo "Building and starting phoenix-api + minio..."
docker compose -f infra/local/docker-compose.app.yml --env-file infra/local/.env.local up -d --build phoenix-api minio minio-init

echo "Waiting for health..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    echo "Phoenix API is up: http://localhost:4000/health"
    exit 0
  fi
  sleep 2
done

echo "Phoenix did not become healthy in time. Check: docker logs minha-casa-phoenix-api-1"
exit 1
