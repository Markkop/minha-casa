-- Add table for tracking processed webhook events (idempotency)
CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS "processed_webhook_events_type_idx" ON "processed_webhook_events" ("event_type");
CREATE INDEX IF NOT EXISTS "processed_webhook_events_processed_at_idx" ON "processed_webhook_events" ("processed_at");

-- Add payment failure tracking to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "last_payment_failed_at" timestamp with time zone;

-- Add Stripe customer ID to users for reuse across subscriptions
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
