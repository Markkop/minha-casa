#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly BACKUP_ROOT="/docker/backups/coolify"
readonly MINHA_PROJECT="njcbvl47cu9hxdna7jbbync5"
readonly TODO_PROJECT="w91axxcbug5u5r7o461vazh5"
readonly FORGEJO_PROJECT="ob0dyrnhupncbey87o24kzxs"
readonly MODE="${1:-daily}"
readonly STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

stopped_containers=()
temporary_files=()

log() {
  printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"
}

container_for() {
  local project="$1"
  local service="$2"
  local container

  container="$(docker ps -q \
    --filter "label=com.docker.compose.project=${project}" \
    --filter "label=com.docker.compose.service=${service}" | head -n 1)"
  if [[ -z "$container" ]]; then
    log "No running container for ${project}/${service}"
    return 1
  fi
  printf '%s\n' "$container"
}

stop_for_archive() {
  local project="$1"
  local service="$2"
  local container

  container="$(container_for "$project" "$service")"
  stopped_containers+=("$container")
  log "Stopping ${project}/${service} for cold archive"
  docker stop --timeout 60 "$container" >/dev/null
}

cleanup() {
  local index
  trap - EXIT
  for ((index=${#stopped_containers[@]}-1; index>=0; index--)); do
    if docker inspect "${stopped_containers[$index]}" >/dev/null 2>&1; then
      log "Restarting ${stopped_containers[$index]} after cold archive"
      docker start "${stopped_containers[$index]}" >/dev/null || \
        log "WARNING: failed to restart ${stopped_containers[$index]}"
    fi
  done
  if ((${#temporary_files[@]})); then
    rm -f -- "${temporary_files[@]}"
  fi
}
trap cleanup EXIT

postgres_dump() {
  local container="$1"
  local database="$2"
  local output="$3"
  local temporary="${output}.partial"

  temporary_files+=("$temporary")
  docker exec "$container" sh -lc \
    "pg_dump -U \"\$POSTGRES_USER\" -d '$database' -Fc" \
    >"$temporary"
  docker exec -i "$container" pg_restore --list <"$temporary" >/dev/null
  mv "$temporary" "$output"
  sha256sum "$output" >"${output}.sha256"
}

daily_backup() {
  local minha_db todo_db forgejo_db
  mkdir -p \
    "$BACKUP_ROOT/minha-casa/daily" \
    "$BACKUP_ROOT/todo-idle-quest/daily" \
    "$BACKUP_ROOT/forgejo/daily" \
    "$BACKUP_ROOT/control-plane/daily"

  minha_db="$(container_for "$MINHA_PROJECT" minha-casa-db)"
  todo_db="$(container_for "$TODO_PROJECT" db)"
  forgejo_db="$(container_for "$FORGEJO_PROJECT" forgejo-db)"

  postgres_dump "$minha_db" minha_casa_prod \
    "$BACKUP_ROOT/minha-casa/daily/minha-casa-${STAMP}.dump"
  postgres_dump "$minha_db" langfuse \
    "$BACKUP_ROOT/minha-casa/daily/langfuse-${STAMP}.dump"

  local todo_database forgejo_database coolify_database
  todo_database="$(docker exec "$todo_db" sh -lc 'printf %s "$POSTGRES_DB"')"
  forgejo_database="$(docker exec "$forgejo_db" sh -lc 'printf %s "$POSTGRES_DB"')"
  coolify_database="$(docker exec coolify-db sh -lc 'printf %s "$POSTGRES_DB"')"

  postgres_dump "$todo_db" "$todo_database" \
    "$BACKUP_ROOT/todo-idle-quest/daily/todo-idle-quest-${STAMP}.dump"
  postgres_dump "$forgejo_db" "$forgejo_database" \
    "$BACKUP_ROOT/forgejo/daily/forgejo-${STAMP}.dump"
  postgres_dump coolify-db "$coolify_database" \
    "$BACKUP_ROOT/control-plane/daily/coolify-${STAMP}.dump"

  find "$BACKUP_ROOT" -path '*/daily/*' -type f -mtime +13 -delete
  log "Daily PostgreSQL backups completed and verified"
}

weekly_backup() {
  local destination="$BACKUP_ROOT/weekly"
  local output="$destination/state-${STAMP}.tar.gz"
  local temporary="${output}.partial"

  mkdir -p "$destination"
  temporary_files+=("$temporary")

  # These services write to the archived directories. Keep the database
  # containers running because their consistent logical dumps are created by
  # daily_backup before this cold archive.
  stop_for_archive "$MINHA_PROJECT" web
  stop_for_archive "$MINHA_PROJECT" phoenix-api
  stop_for_archive "$MINHA_PROJECT" langfuse-web
  stop_for_archive "$MINHA_PROJECT" langfuse-worker
  stop_for_archive "$MINHA_PROJECT" hermes-agent
  stop_for_archive "$MINHA_PROJECT" minio
  stop_for_archive "$MINHA_PROJECT" langfuse-clickhouse
  stop_for_archive "$FORGEJO_PROJECT" forgejo

  tar -C / -czf "$temporary" \
    var/lib/docker/volumes/vps_minha_casa_minio/_data \
    var/lib/docker/volumes/vps_minha_casa_hermes_data/_data \
    var/lib/docker/volumes/vps_minha_casa_hermes_jobs/_data \
    var/lib/docker/volumes/vps_minha_casa_langfuse_clickhouse/_data \
    docker/forgejo/forgejo-data \
    data/coolify/source/.env \
    data/coolify/ssh/keys

  tar -tzf "$temporary" >/dev/null
  mv "$temporary" "$output"
  sha256sum "$output" >"${output}.sha256"
  find "$destination" -type f -mtime +27 -delete
  log "Weekly cold archive completed and verified"
}

exec 9>/run/lock/coolify-local-backup.lock
if ! flock -n 9; then
  log "Another backup is already running"
  exit 0
fi

case "$MODE" in
  daily)
    daily_backup
    ;;
  weekly)
    daily_backup
    weekly_backup
    ;;
  *)
    printf 'Usage: %s {daily|weekly}\n' "$0" >&2
    exit 2
    ;;
esac
