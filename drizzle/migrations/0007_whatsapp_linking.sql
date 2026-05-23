CREATE TABLE IF NOT EXISTS "whatsapp_link_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "wa_id" text NOT NULL,
  "phone" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "inserted_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_link_codes_code_idx" ON "whatsapp_link_codes" ("code");
CREATE INDEX IF NOT EXISTS "whatsapp_link_codes_wa_id_idx" ON "whatsapp_link_codes" ("wa_id");

CREATE TABLE IF NOT EXISTS "whatsapp_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wa_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "phone" text,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_identities_wa_id_idx" ON "whatsapp_identities" ("wa_id");
CREATE INDEX IF NOT EXISTS "whatsapp_identities_user_id_idx" ON "whatsapp_identities" ("user_id");
