-- Migration: Listing preference catalog (workspace-scoped)

CREATE TABLE IF NOT EXISTS "listing_preference_catalog" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "label" text NOT NULL,
  "source" text NOT NULL DEFAULT 'custom',
  "visible" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "legacy_key" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "listing_preference_catalog_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  ),
  CONSTRAINT "listing_preference_catalog_source_check" CHECK ("source" IN ('system', 'custom'))
);

CREATE INDEX IF NOT EXISTS "listing_preference_catalog_user_id_idx"
  ON "listing_preference_catalog" ("user_id");

CREATE INDEX IF NOT EXISTS "listing_preference_catalog_org_id_idx"
  ON "listing_preference_catalog" ("org_id");

CREATE UNIQUE INDEX IF NOT EXISTS "listing_preference_catalog_user_key_idx"
  ON "listing_preference_catalog" ("user_id", "key")
  WHERE "org_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "listing_preference_catalog_org_key_idx"
  ON "listing_preference_catalog" ("org_id", "key")
  WHERE "user_id" IS NULL;

CREATE OR REPLACE TRIGGER update_listing_preference_catalog_updated_at
  BEFORE UPDATE ON "listing_preference_catalog"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
