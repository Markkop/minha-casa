CREATE TABLE IF NOT EXISTS "organization_invites" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "role" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "accepted_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "organization_invites_role_check" CHECK ("role" IN ('owner', 'admin', 'member')),
  CONSTRAINT "organization_invites_status_check" CHECK ("status" IN ('pending', 'accepted', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_token_idx" ON "organization_invites" ("token");
CREATE INDEX IF NOT EXISTS "organization_invites_org_id_idx" ON "organization_invites" ("org_id");
CREATE INDEX IF NOT EXISTS "organization_invites_created_by_user_id_idx" ON "organization_invites" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "organization_invites_accepted_by_user_id_idx" ON "organization_invites" ("accepted_by_user_id");
