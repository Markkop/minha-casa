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

printf 'Generated %s/server.crt and %s/server.key\n' "$CERT_DIR" "$CERT_DIR"
