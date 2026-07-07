CREATE TABLE IF NOT EXISTS "financeiro_scenarios" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "collection_id" uuid NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "financeiro_scenarios_collection_id_idx" ON "financeiro_scenarios" ("collection_id");
CREATE INDEX IF NOT EXISTS "financeiro_scenarios_collection_created_at_idx" ON "financeiro_scenarios" ("collection_id", "created_at");
