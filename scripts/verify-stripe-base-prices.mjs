#!/usr/bin/env node

import pg from "pg"

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function connectionStringWithoutSslMode(url) {
  const without = url.replace(/([?&])sslmode=[^&]*/gi, (_, separator) => separator)
  return without.replace(/\?&/, "?").replace(/\?$/, "").replace(/&$/, "")
}

function databaseClient(connectionString) {
  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=(require|verify-full|verify-ca|prefer)/i.test(connectionString)

  return new pg.Client({
    connectionString: sslEnabled
      ? connectionStringWithoutSslMode(connectionString)
      : connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  })
}

async function stripeGet(secretKey, path) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const payload = await response.json()

  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`
    throw new Error(`Stripe GET ${path} failed: ${message}`)
  }

  return payload
}

function assertMonthlyPrice(price, expected) {
  const mismatches = []
  if (!price.active) mismatches.push("inactive")
  if (price.currency !== expected.currency) {
    mismatches.push(`currency=${price.currency}`)
  }
  if (price.unit_amount !== expected.amount) {
    mismatches.push(`unit_amount=${price.unit_amount}`)
  }
  if (price.type !== "recurring") mismatches.push(`type=${price.type}`)
  if (price.recurring?.interval !== "month") {
    mismatches.push(`interval=${price.recurring?.interval}`)
  }
  if (price.recurring?.interval_count !== 1) {
    mismatches.push(`interval_count=${price.recurring?.interval_count}`)
  }

  if (mismatches.length > 0) {
    throw new Error(
      `Stripe Price ${price.id} does not match ${expected.label}: ${mismatches.join(", ")}`
    )
  }
}

async function retrievePrice(secretKey, priceId) {
  return stripeGet(secretKey, `/v1/prices/${encodeURIComponent(priceId)}`)
}

async function verifyBasePrices(client, secretKey) {
  const result = await client.query(
    `SELECT slug, name, price_in_cents, stripe_price_id
       FROM plans
      WHERE is_active = true AND price_in_cents > 0
      ORDER BY slug`
  )

  if (result.rowCount === 0) {
    throw new Error("No active paid plans were found in the database.")
  }

  for (const plan of result.rows) {
    if (!plan.stripe_price_id) {
      throw new Error(`Plan ${plan.slug} has no stripe_price_id.`)
    }

    const price = await retrievePrice(secretKey, plan.stripe_price_id)
    assertMonthlyPrice(price, {
      amount: plan.price_in_cents,
      currency: "brl",
      label: `${plan.name} base plan`,
    })
    console.log(`Verified base Price for ${plan.slug}: ${price.id}`)
  }

  console.log(`Verified ${result.rowCount} active paid base Price(s).`)
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error(`Unknown argument(s): ${process.argv.slice(2).join(", ")}`)
  }

  const connectionString = requiredEnv("DATABASE_URL")
  const secretKey = requiredEnv("STRIPE_SECRET_KEY")
  const client = databaseClient(connectionString)

  await client.connect()
  try {
    await verifyBasePrices(client, secretKey)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`[verify-stripe-base-prices] ${error.message}`)
  process.exitCode = 1
})
