-- Migration: Workspace Decision Data
-- Description: Add profile-scoped decision entities for links, contacts, regions,
--              condominiums, comparison notes, and listing metadata.

ALTER TABLE "listings" ALTER COLUMN "data" TYPE jsonb;

CREATE TABLE IF NOT EXISTS "saved_links" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "saved_links_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS "saved_links_user_id_idx" ON "saved_links" ("user_id");
CREATE INDEX IF NOT EXISTS "saved_links_org_id_idx" ON "saved_links" ("org_id");

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text,
  "phone" text,
  "normalized_phone" text,
  "email" text,
  "notes" text,
  "source" text NOT NULL DEFAULT 'manual',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "contacts_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  ),
  CONSTRAINT "contacts_source_check" CHECK ("source" IN ('manual', 'listing'))
);

CREATE INDEX IF NOT EXISTS "contacts_user_id_idx" ON "contacts" ("user_id");
CREATE INDEX IF NOT EXISTS "contacts_org_id_idx" ON "contacts" ("org_id");
CREATE INDEX IF NOT EXISTS "contacts_normalized_phone_idx" ON "contacts" ("normalized_phone");

CREATE TABLE IF NOT EXISTS "regions" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "city" text NOT NULL,
  "neighborhood" text NOT NULL,
  "property_type" text NOT NULL,
  "price_per_m2" integer NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "regions_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  ),
  CONSTRAINT "regions_property_type_check" CHECK ("property_type" IN ('casa', 'apartamento')),
  CONSTRAINT "regions_price_per_m2_check" CHECK ("price_per_m2" >= 0)
);

CREATE INDEX IF NOT EXISTS "regions_user_id_idx" ON "regions" ("user_id");
CREATE INDEX IF NOT EXISTS "regions_org_id_idx" ON "regions" ("org_id");
CREATE INDEX IF NOT EXISTS "regions_lookup_idx" ON "regions" ("city", "neighborhood", "property_type");

CREATE TABLE IF NOT EXISTS "condominiums" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "city" text,
  "neighborhood" text,
  "address" text,
  "property_type" text,
  "amenities" jsonb DEFAULT '[]'::jsonb,
  "notes" text,
  "source" text NOT NULL DEFAULT 'manual',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "condominiums_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  ),
  CONSTRAINT "condominiums_property_type_check" CHECK ("property_type" IS NULL OR "property_type" IN ('casa', 'apartamento')),
  CONSTRAINT "condominiums_source_check" CHECK ("source" IN ('manual', 'listing'))
);

CREATE INDEX IF NOT EXISTS "condominiums_user_id_idx" ON "condominiums" ("user_id");
CREATE INDEX IF NOT EXISTS "condominiums_org_id_idx" ON "condominiums" ("org_id");
CREATE INDEX IF NOT EXISTS "condominiums_name_idx" ON "condominiums" ("name");

CREATE TABLE IF NOT EXISTS "listing_comparison_notes" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "pros" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "cons" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_comparison_notes_listing_id_idx" ON "listing_comparison_notes" ("listing_id");

CREATE OR REPLACE TRIGGER update_saved_links_updated_at
  BEFORE UPDATE ON "saved_links"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON "contacts"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON "regions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_condominiums_updated_at
  BEFORE UPDATE ON "condominiums"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_listing_comparison_notes_updated_at
  BEFORE UPDATE ON "listing_comparison_notes"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
