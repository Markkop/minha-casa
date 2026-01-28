-- Migration: Add Stripe fields
-- Description: Add Stripe-related columns to subscriptions and plans tables

-- ============================================================================
-- Add Stripe fields to subscriptions table
-- ============================================================================
ALTER TABLE "subscriptions" 
ADD COLUMN IF NOT EXISTS "stripe_customer_id" text,
ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text,
ADD COLUMN IF NOT EXISTS "stripe_status" text,
ADD COLUMN IF NOT EXISTS "current_period_end" timestamptz,
ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false;

-- ============================================================================
-- Add Stripe price ID to plans table
-- ============================================================================
ALTER TABLE "plans" 
ADD COLUMN IF NOT EXISTS "stripe_price_id" text;

-- ============================================================================
-- Create index for Stripe subscription lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_sub_id_idx" ON "subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "subscriptions_stripe_customer_id_idx" ON "subscriptions" ("stripe_customer_id");
