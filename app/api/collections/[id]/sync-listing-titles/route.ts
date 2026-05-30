import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, listings } from "@/lib/db"
import { eq } from "drizzle-orm"
import { persistCollectionListingTitulos } from "@/lib/sync-collection-listing-titulos"
import { verifyCollectionAccess } from "@/lib/db/helpers"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/collections/[id]/sync-listing-titles
 * Regenerate auto titles for all listings in the collection.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const access = await verifyCollectionAccess(id, session.user.id)

    if (!access) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const canEdit =
      !access.isOrgCollection ||
      access.memberRole === "owner" ||
      access.memberRole === "admin"

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await persistCollectionListingTitulos(id)

    const db = getDb()
    const collectionListings = await db
      .select()
      .from(listings)
      .where(eq(listings.collectionId, id))
      .orderBy(listings.createdAt)

    return NextResponse.json({ listings: collectionListings })
  } catch (error) {
    console.error("Error syncing listing titles:", error)
    return NextResponse.json(
      { error: "Failed to sync listing titles" },
      { status: 500 }
    )
  }
}
