#!/usr/bin/env node
/**
 * Sets `plans.stripe_price_id` for the Plus plan (slug `plus`).
 *
 * Usage (production):
 *   DATABASE_URL='postgresql://...' node scripts/sync-plus-stripe-live.mjs
 *
 * Optional:
 *   PLUS_STRIPE_PRICE_ID=price_xxx  (defaults to env-specific live Price below)
 */

import pg from "pg"

/** Live Price ID created for prod `Minha Casa Plus` (Stripe livemode). Override if you rotate prices. */
const DEFAULT_LIVE_PRICE_ID = "price_1TZEMxBysq497srN7Bj6rFu6"

/** Match lib/db/pool.ts — pg treats sslmode=require like verify-full unless stripped. */
function connectionStringWithoutSslMode(url) {
  const without = url.replace(/([?&])sslmode=[^&]*/gi, (_, sep) => sep)
  return without.replace(/\?&/, "?").replace(/\?$/, "").replace(/&$/, "")
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    console.warn(
      "[sync-plus-stripe-live] DATABASE_URL not set — skipping (OK for local builds without DB)."
    )
    process.exit(0)
  }

  const priceId = process.env.PLUS_STRIPE_PRICE_ID ?? DEFAULT_LIVE_PRICE_ID

  let host = "(unknown)"
  try {
    host = new URL(connectionString.replace(/^postgresql:/, "postgres:")).hostname
  } catch {
    /* ignore */
  }
  console.log(`[sync-plus-stripe-live] Updating plans.slug=plus on host ${host}`)

  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=(require|verify-full|verify-ca|prefer)/i.test(connectionString)

  const client = new pg.Client({
    connectionString: sslEnabled
      ? connectionStringWithoutSslMode(connectionString)
      : connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()
  try {
    const res = await client.query(
      `UPDATE plans
       SET stripe_price_id = $1, updated_at = now()
       WHERE slug = $2
       RETURNING slug, name, stripe_price_id`,
      [priceId, "plus"]
    )
    if (res.rowCount !== 1) {
      console.error("Expected to update exactly one row; got:", res.rowCount)
      process.exit(1)
    }
    console.log("OK:", res.rows[0])
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
