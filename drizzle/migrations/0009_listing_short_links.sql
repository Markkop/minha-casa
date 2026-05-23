CREATE TABLE IF NOT EXISTS "listing_short_links" (
  "short_id" text PRIMARY KEY NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "collection_id" uuid NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "listing_short_links_listing_id_idx" ON "listing_short_links" ("listing_id");
CREATE INDEX IF NOT EXISTS "listing_short_links_collection_id_idx" ON "listing_short_links" ("collection_id");
