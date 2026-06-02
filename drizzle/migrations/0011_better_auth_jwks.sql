-- Better Auth JWT plugin: stores Ed25519 (or other) key pairs for /api/auth/token and /api/auth/jwks
CREATE TABLE IF NOT EXISTS "jwks" (
  "id" text PRIMARY KEY,
  "public_key" text NOT NULL,
  "private_key" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "expires_at" timestamptz,
  "alg" text,
  "crv" text
);
