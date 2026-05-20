import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, plans } from "@/lib/db"
import { eq } from "drizzle-orm"

interface PatchPlanBody {
  stripePriceId?: string | null
}

/**
 * PATCH /api/admin/plans/[slug]
 * Update Stripe catalog mapping for a plan (admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireAdmin()
    const { slug } = await params
    const body = (await request.json()) as PatchPlanBody
    const { stripePriceId } = body

    if (stripePriceId === undefined) {
      return NextResponse.json(
        { error: "stripePriceId is required (string or null to clear)" },
        { status: 400 }
      )
    }

    if (stripePriceId !== null) {
      if (typeof stripePriceId !== "string" || stripePriceId.trim().length === 0) {
        return NextResponse.json(
          { error: "stripePriceId must be a non-empty string or null" },
          { status: 400 }
        )
      }
    }

    const db = getDb()

    const [updated] = await db
      .update(plans)
      .set({
        stripePriceId: stripePriceId === null ? null : stripePriceId.trim(),
        updatedAt: new Date(),
      })
      .where(eq(plans.slug, slug))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    return NextResponse.json({ plan: updated })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("PATCH /api/admin/plans/[slug] error:", error)
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 })
  }
}
