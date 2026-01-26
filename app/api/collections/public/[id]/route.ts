import { NextRequest, NextResponse } from "next/server"
import { getDb, collections, users, listings } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/collections/public/[id]
 * Get a public collection with its listings (no authentication required)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const db = getDb()

    // Fetch the collection with owner info
    const [collection] = await db
      .select({
        id: collections.id,
        userId: collections.userId,
        orgId: collections.orgId,
        name: collections.name,
        isPublic: collections.isPublic,
        shareToken: collections.shareToken,
        isDefault: collections.isDefault,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        ownerName: users.name,
      })
      .from(collections)
      .leftJoin(users, eq(collections.userId, users.id))
      .where(
        and(
          eq(collections.id, id),
          eq(collections.isPublic, true)
        )
      )

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found or is not public" },
        { status: 404 }
      )
    }

    // Fetch listings for the collection
    const collectionListings = await db
      .select()
      .from(listings)
      .where(eq(listings.collectionId, id))
      .orderBy(desc(listings.createdAt))

    return NextResponse.json({
      collection,
      listings: collectionListings,
    })
  } catch (error) {
    console.error("Error fetching public collection:", error)
    return NextResponse.json(
      { error: "Failed to fetch public collection" },
      { status: 500 }
    )
  }
}
