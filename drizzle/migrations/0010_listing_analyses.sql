-- Superseded by Phoenix migration 20260525000100 (needs ai_workflow_runs first).
-- Not registered in drizzle/migrations/meta/_journal.json — do not add back without coordination.
CREATE TABLE IF NOT EXISTS "listing_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "workflow_run_id" uuid REFERENCES "ai_workflow_runs"("id") ON DELETE SET NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'queued',
  "input" jsonb NOT NULL DEFAULT '{}',
  "result" jsonb,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "listing_analyses_listing_id_idx" ON "listing_analyses" ("listing_id");
CREATE INDEX IF NOT EXISTS "listing_analyses_user_id_idx" ON "listing_analyses" ("user_id");
CREATE INDEX IF NOT EXISTS "listing_analyses_org_id_idx" ON "listing_analyses" ("org_id");
CREATE INDEX IF NOT EXISTS "listing_analyses_status_idx" ON "listing_analyses" ("status");
CREATE INDEX IF NOT EXISTS "listing_analyses_listing_status_idx" ON "listing_analyses" ("listing_id", "status");
