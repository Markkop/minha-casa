import { NextRequest, NextResponse } from "next/server"
import { getDb, plans } from "@/lib/db"
import { eq } from "drizzle-orm"

const LIVE_PLUS_PRICE_ID =
  process.env.PLUS_STRIPE_PRICE_ID ?? "price_1TZEMxBysq497srN7Bj6rFu6"

/**
 * POST /api/internal/sync-plus-stripe
 *
 * One-shot ops: set Plus stripe_price_id on the deployment's DATABASE_URL.
 * Protected by SHARE_MASTER_PASSWORD (same secret as share links).
 */
export async function POST(request: NextRequest) {
  const master = process.env.SHARE_MASTER_PASSWORD
  if (!master) {
    return NextResponse.json(
      { error: "SHARE_MASTER_PASSWORD is not configured" },
      { status: 503 }
    )
  }

  const auth = request.headers.get("authorization")
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token || token !== master) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getDb()
    const [updated] = await db
      .update(plans)
      .set({
        stripePriceId: LIVE_PLUS_PRICE_ID,
        updatedAt: new Date(),
      })
      .where(eq(plans.slug, "plus"))
      .returning({
        slug: plans.slug,
        name: plans.name,
        stripePriceId: plans.stripePriceId,
      })

    if (!updated) {
      return NextResponse.json({ error: "Plan plus not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, plan: updated })
  } catch (error) {
    console.error("POST /api/internal/sync-plus-stripe:", error)
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    )
  }
}
