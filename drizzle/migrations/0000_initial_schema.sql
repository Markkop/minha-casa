-- Migration: Initial Schema
-- Description: Create all tables for Minha Casa MVP
-- Tables: users, accounts, sessions, verifications, plans, subscriptions, 
--         organizations, organization_members, collections, listings

-- ============================================================================
-- Enable UUID extension (if not already enabled)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users table (BetterAuth compatible)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "name" text NOT NULL,
  "image" text,
  "is_admin" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

-- ============================================================================
-- Accounts table (BetterAuth - for credential/OAuth providers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "access_token_expires_at" timestamptz,
  "refresh_token_expires_at" timestamptz,
  "scope" text,
  "id_token" text,
  "password" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_account_idx" ON "accounts" ("provider_id", "account_id");

-- ============================================================================
-- Sessions table (BetterAuth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token");

-- ============================================================================
-- Verifications table (BetterAuth - email verification, password reset)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "verifications" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications" ("identifier");

-- ============================================================================
-- Plans table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "plans" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL UNIQUE,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "price_in_cents" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "limits" jsonb DEFAULT '{"collectionsLimit": null, "listingsPerCollection": null, "aiParsesPerMonth": null, "canShare": true, "canCreateOrg": true}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Subscriptions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES "plans"("id") ON DELETE RESTRICT,
  "status" text NOT NULL DEFAULT 'active',
  "starts_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "granted_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "subscriptions_status_check" CHECK ("status" IN ('active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" ("status");

-- ============================================================================
-- Organizations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" ("slug");
CREATE INDEX IF NOT EXISTS "organizations_owner_id_idx" ON "organizations" ("owner_id");

-- ============================================================================
-- Organization Members table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "organization_members" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'member',
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "organization_members_role_check" CHECK ("role" IN ('owner', 'admin', 'member'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_members_org_user_idx" ON "organization_members" ("org_id", "user_id");
CREATE INDEX IF NOT EXISTS "organization_members_user_id_idx" ON "organization_members" ("user_id");

-- ============================================================================
-- Collections table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "collections" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "is_public" boolean NOT NULL DEFAULT false,
  "share_token" text UNIQUE,
  "is_default" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "collections_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR 
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "collections_user_id_idx" ON "collections" ("user_id");
CREATE INDEX IF NOT EXISTS "collections_org_id_idx" ON "collections" ("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "collections_share_token_idx" ON "collections" ("share_token");

-- ============================================================================
-- Listings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "listings" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "collection_id" uuid NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "data" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "listings_collection_id_idx" ON "listings" ("collection_id");

-- ============================================================================
-- Seed default plans
-- ============================================================================
INSERT INTO "plans" ("name", "slug", "description", "price_in_cents", "is_active", "limits")
VALUES 
  ('Teste', 'teste', 'Plano de teste interno', 0, true, '{"collectionsLimit": null, "listingsPerCollection": null, "aiParsesPerMonth": null, "canShare": true, "canCreateOrg": true}'::jsonb),
  ('Plus', 'plus', 'Acesso completo à plataforma', 2000, true, '{"collectionsLimit": null, "listingsPerCollection": null, "aiParsesPerMonth": null, "canShare": true, "canCreateOrg": true}'::jsonb)
ON CONFLICT ("slug") DO NOTHING;

-- ============================================================================
-- Updated at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON "accounts"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON "sessions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON "verifications"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON "plans"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON "organizations"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON "collections"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON "listings"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
