import { NextResponse } from "next/server"
import { getDb, collections, users, listings } from "@/lib/db"
import { eq, desc, sql } from "drizzle-orm"

/**
 * GET /api/collections/public
 * List all public collections (no authentication required)
 */
export async function GET() {
  try {
    const db = getDb()

    // Fetch public collections with owner name and listings count
    const publicCollections = await db
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
        listingsCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${listings}
          WHERE ${listings.collectionId} = ${collections.id}
        )`,
      })
      .from(collections)
      .leftJoin(users, eq(collections.userId, users.id))
      .where(eq(collections.isPublic, true))
      .orderBy(desc(collections.updatedAt))

    return NextResponse.json({ collections: publicCollections })
  } catch (error) {
    console.error("Error fetching public collections:", error)
    return NextResponse.json(
      { error: "Failed to fetch public collections" },
      { status: 500 }
    )
  }
}
