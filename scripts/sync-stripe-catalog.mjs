#!/usr/bin/env node

import pg from "pg"

const APPLY_FLAG = "--apply"
const EXTRA_SEAT_LOOKUP_KEY =
  "minha_casa_imobiliaria_additional_seat_brl_monthly_v1"
const EXTRA_SEAT_AMOUNT = 3_900
const EXTRA_SEAT_CURRENCY = "brl"

function parseArgs(argv) {
  const unknown = argv.filter((arg) => arg !== APPLY_FLAG)
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(", ")}`)
  }

  return { apply: argv.includes(APPLY_FLAG) }
}

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

async function stripeRequest(secretKey, method, path, form, idempotencyKey) {
  const headers = { Authorization: `Bearer ${secretKey}` }
  if (form) headers["Content-Type"] = "application/x-www-form-urlencoded"
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey

  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers,
    body: form ? new URLSearchParams(form) : undefined,
  })
  const payload = await response.json()

  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`
    throw new Error(`Stripe ${method} ${path} failed: ${message}`)
  }

  return payload
}

function stripeGet(secretKey, path) {
  return stripeRequest(secretKey, "GET", path)
}

function stripePost(secretKey, path, form, idempotencyKey) {
  return stripeRequest(secretKey, "POST", path, form, idempotencyKey)
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
  const params = new URLSearchParams({ "expand[]": "product" })
  return stripeGet(secretKey, `/v1/prices/${encodeURIComponent(priceId)}?${params}`)
}

async function priceByLookupKey(secretKey, lookupKey) {
  const params = new URLSearchParams({
    "lookup_keys[]": lookupKey,
    active: "true",
    limit: "2",
    "expand[]": "data.product",
  })
  const payload = await stripeGet(secretKey, `/v1/prices?${params}`)

  if (payload.data.length > 1) {
    throw new Error(`Stripe returned more than one active Price for ${lookupKey}.`)
  }

  return payload.data[0] ?? null
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

  const verified = new Map()
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
    verified.set(plan.slug, { plan, price })
    console.log(`Verified base Price for ${plan.slug}: ${price.id}`)
  }

  return verified
}

async function canonicalExtraSeatPrice({ apply, client, secretKey, basePrice }) {
  const planResult = await client.query(
    `SELECT stripe_additional_seat_price_id
       FROM plans
      WHERE slug = 'imobiliaria'`
  )
  if (planResult.rowCount !== 1) {
    throw new Error(`Expected exactly one imobiliaria plan; found ${planResult.rowCount}.`)
  }

  const configuredId = planResult.rows[0].stripe_additional_seat_price_id
  const lookupPrice = await priceByLookupKey(secretKey, EXTRA_SEAT_LOOKUP_KEY)
  if (lookupPrice) {
    assertMonthlyPrice(lookupPrice, {
      amount: EXTRA_SEAT_AMOUNT,
      currency: EXTRA_SEAT_CURRENCY,
      label: "Imobiliária additional seat",
    })
    console.log(`Reusing extra-seat Price by lookup key: ${lookupPrice.id}`)
    return { price: lookupPrice, configuredId }
  }

  if (configuredId) {
    const configuredPrice = await retrievePrice(secretKey, configuredId)
    assertMonthlyPrice(configuredPrice, {
      amount: EXTRA_SEAT_AMOUNT,
      currency: EXTRA_SEAT_CURRENCY,
      label: "Imobiliária additional seat",
    })

    if (!apply) {
      console.log(
        `Would assign lookup key ${EXTRA_SEAT_LOOKUP_KEY} to configured Price ${configuredPrice.id}`
      )
      return { price: configuredPrice, configuredId }
    }

    const updated = await stripePost(
      secretKey,
      `/v1/prices/${encodeURIComponent(configuredPrice.id)}`,
      { lookup_key: EXTRA_SEAT_LOOKUP_KEY, transfer_lookup_key: "true" },
      `stripe-catalog-extra-seat-lookup-v1-${configuredPrice.id}`
    )
    console.log(`Assigned canonical lookup key to extra-seat Price: ${updated.id}`)
    return { price: updated, configuredId }
  }

  if (!apply) {
    console.log(
      `Would create BRL ${EXTRA_SEAT_AMOUNT / 100}/month extra-seat Price with lookup key ${EXTRA_SEAT_LOOKUP_KEY}`
    )
    return { price: null, configuredId }
  }

  const productId =
    typeof basePrice.product === "string" ? basePrice.product : basePrice.product?.id
  if (!productId) {
    throw new Error("The Imobiliária base Price has no reusable Stripe Product.")
  }

  const created = await stripePost(
    secretKey,
    "/v1/prices",
    {
      product: productId,
      currency: EXTRA_SEAT_CURRENCY,
      unit_amount: String(EXTRA_SEAT_AMOUNT),
      "recurring[interval]": "month",
      "recurring[interval_count]": "1",
      lookup_key: EXTRA_SEAT_LOOKUP_KEY,
      "metadata[kind]": "additional_seat",
      "metadata[plan_slug]": "imobiliaria",
    },
    "stripe-catalog-imobiliaria-extra-seat-brl-monthly-v1"
  )
  console.log(`Created canonical extra-seat Price: ${created.id}`)
  return { price: created, configuredId }
}

async function persistExtraSeatPrice(client, priceId) {
  await client.query("BEGIN")
  try {
    const result = await client.query(
      `UPDATE plans
          SET included_seats = 10,
              additional_seat_price_in_cents = $1,
              stripe_additional_seat_price_id = $2,
              updated_at = now()
        WHERE slug = 'imobiliaria'
        RETURNING slug`,
      [EXTRA_SEAT_AMOUNT, priceId]
    )
    if (result.rowCount !== 1) {
      throw new Error(`Expected to update one imobiliaria plan; updated ${result.rowCount}.`)
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  }
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2))
  const connectionString = requiredEnv("DATABASE_URL")
  const secretKey = requiredEnv("STRIPE_SECRET_KEY")
  const client = databaseClient(connectionString)

  console.log(apply ? "Stripe catalog apply mode" : "Stripe catalog dry run")
  await client.connect()
  try {
    const basePrices = await verifyBasePrices(client, secretKey)
    const imobiliaria = basePrices.get("imobiliaria")
    if (!imobiliaria) throw new Error("The active paid imobiliaria plan was not found.")

    const { price, configuredId } = await canonicalExtraSeatPrice({
      apply,
      client,
      secretKey,
      basePrice: imobiliaria.price,
    })

    if (!apply) {
      if (price && configuredId !== price.id) {
        console.log(`Would persist extra-seat Price ${price.id} on the imobiliaria plan.`)
      }
      console.log("Dry run complete; no Stripe or database changes were made.")
      return
    }

    await persistExtraSeatPrice(client, price.id)
    console.log(`Catalog synchronized; imobiliaria extra-seat Price is ${price.id}.`)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(`[sync-stripe-catalog] ${error.message}`)
  process.exitCode = 1
})
