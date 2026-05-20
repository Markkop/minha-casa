#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CERT_DIR="$SCRIPT_DIR/../certs"
mkdir -p "$CERT_DIR"

openssl req \
  -new \
  -x509 \
  -days 3650 \
  -nodes \
  -text \
  -subj "/CN=minha-casa-postgres" \
  -out "$CERT_DIR/server.crt" \
  -keyout "$CERT_DIR/server.key"

chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

# postgres:17-alpine runs as UID/GID 70; bind-mounted certs must be readable by that user.
chown 70:70 "$CERT_DIR/server.key" "$CERT_DIR/server.crt" 2>/dev/null || true

printf 'Generated %s/server.crt and %s/server.key\n' "$CERT_DIR" "$CERT_DIR"
printf 'Note: If chown 70:70 failed, run it as root so the container can read the TLS key.\n'
