CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- migrate:split

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  image text,
  is_admin boolean NOT NULL DEFAULT false,
  cpf_cnpj text,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email);
-- migrate:split

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts (user_id);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_idx
  ON accounts (provider_id, account_id);
-- migrate:split

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions (token);
-- migrate:split

CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE INDEX IF NOT EXISTS verifications_identifier_idx ON verifications (identifier);
-- migrate:split

CREATE TABLE IF NOT EXISTS jwks (
  id text PRIMARY KEY,
  public_key text NOT NULL,
  private_key text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz,
  alg text,
  crv text
);
-- migrate:split

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- migrate:split

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- migrate:split
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
-- migrate:split
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
-- migrate:split
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_verifications_updated_at ON verifications;
-- migrate:split
CREATE TRIGGER update_verifications_updated_at BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
