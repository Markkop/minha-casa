import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getAvailableAddons } from "@/lib/addons"

/**
 * GET /api/admin/addons
 * List all available addons (admin only)
 */
export async function GET() {
  try {
    await requireAdmin()

    const addons = await getAvailableAddons()

    return NextResponse.json({ addons })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error fetching addons:", error)
    return NextResponse.json(
      { error: "Failed to fetch addons" },
      { status: 500 }
    )
  }
}
