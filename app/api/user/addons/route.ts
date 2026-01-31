import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getUserAddons, getAvailableAddons } from "@/lib/addons"

/**
 * GET /api/user/addons
 * Get the current user's personal addons (enabled and not expired)
 * Returns addons with their details
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's active addon grants
    const userAddonGrants = await getUserAddons(session.user.id)

    // Get addon details for enrichment
    const allAddons = await getAvailableAddons()
    const addonMap = new Map(allAddons.map((a) => [a.slug, a]))

    // Transform into response format with addon details
    const addonsWithDetails = userAddonGrants.map((grant) => ({
      id: grant.id,
      addonSlug: grant.addonSlug,
      grantedAt: grant.grantedAt,
      expiresAt: grant.expiresAt,
      addon: addonMap.get(grant.addonSlug) || null,
    }))

    return NextResponse.json({
      addons: addonsWithDetails,
    })
  } catch (error) {
    console.error("Error fetching user addons:", error)
    return NextResponse.json(
      { error: "Failed to fetch user addons" },
      { status: 500 }
    )
  }
}
