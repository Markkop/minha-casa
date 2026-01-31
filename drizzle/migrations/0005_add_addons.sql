-- Migration: Add Addons System
-- Description: Create tables for addon management (addons, user_addons, organization_addons)
-- This enables per-user and per-organization addon access control

-- ============================================================================
-- Addons table (master list of available addons)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "addons" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "addons_slug_idx" ON "addons" ("slug");

-- ============================================================================
-- User Addons table (tracks which addons are granted to users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "user_addons" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "addon_slug" text NOT NULL,
  "granted_at" timestamptz NOT NULL DEFAULT now(),
  "granted_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "expires_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "user_addons_user_id_idx" ON "user_addons" ("user_id");
CREATE INDEX IF NOT EXISTS "user_addons_addon_slug_idx" ON "user_addons" ("addon_slug");
CREATE UNIQUE INDEX IF NOT EXISTS "user_addons_user_addon_idx" ON "user_addons" ("user_id", "addon_slug");

-- ============================================================================
-- Organization Addons table (tracks which addons are granted to organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "organization_addons" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "addon_slug" text NOT NULL,
  "granted_at" timestamptz NOT NULL DEFAULT now(),
  "granted_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "expires_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "organization_addons_org_id_idx" ON "organization_addons" ("organization_id");
CREATE INDEX IF NOT EXISTS "organization_addons_addon_slug_idx" ON "organization_addons" ("addon_slug");
CREATE UNIQUE INDEX IF NOT EXISTS "organization_addons_org_addon_idx" ON "organization_addons" ("organization_id", "addon_slug");

-- ============================================================================
-- Seed initial addons
-- ============================================================================
INSERT INTO "addons" ("name", "slug", "description")
VALUES 
  ('Risco de Enchente', 'flood', 'Análise de risco de enchente com visualização 3D'),
  ('Simulador de Financiamento', 'financiamento', 'Simulador de financiamento imobiliário')
ON CONFLICT ("slug") DO NOTHING;
