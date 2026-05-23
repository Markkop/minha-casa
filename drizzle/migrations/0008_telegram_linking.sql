CREATE TABLE IF NOT EXISTS "telegram_link_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "chat_id" text NOT NULL,
  "telegram_user_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "inserted_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_link_codes_code_idx" ON "telegram_link_codes" ("code");
CREATE INDEX IF NOT EXISTS "telegram_link_codes_chat_id_idx" ON "telegram_link_codes" ("chat_id");

CREATE TABLE IF NOT EXISTS "telegram_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" text NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "telegram_user_id" text,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_identities_chat_id_idx" ON "telegram_identities" ("chat_id");
CREATE INDEX IF NOT EXISTS "telegram_identities_user_id_idx" ON "telegram_identities" ("user_id");

CREATE TABLE IF NOT EXISTS "telegram_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_event_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" text DEFAULT 'received' NOT NULL,
  "error" text,
  "inserted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_events_provider_event_id_idx" ON "telegram_events" ("provider_event_id");
CREATE INDEX IF NOT EXISTS "telegram_events_status_idx" ON "telegram_events" ("status");
