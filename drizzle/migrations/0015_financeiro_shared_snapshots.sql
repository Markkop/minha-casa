CREATE TABLE IF NOT EXISTS "financeiro_shared_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "token" text NOT NULL UNIQUE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "financeiro_shared_snapshots_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "org_id" IS NULL) OR
    ("user_id" IS NULL AND "org_id" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS "financeiro_shared_snapshots_token_idx" ON "financeiro_shared_snapshots" ("token");
CREATE INDEX IF NOT EXISTS "financeiro_shared_snapshots_user_id_idx" ON "financeiro_shared_snapshots" ("user_id");
CREATE INDEX IF NOT EXISTS "financeiro_shared_snapshots_org_id_idx" ON "financeiro_shared_snapshots" ("org_id");
