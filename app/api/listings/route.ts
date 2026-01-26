import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, type ListingData } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import {
  handleApiError,
  successResponse,
  requireAuth,
  requireField,
  requireString,
  requireResource,
} from "@/lib/errors"

/**
 * POST /api/listings
 * Create a new listing in a collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    requireAuth(session)

    const body = await request.json()
    const { collectionId, data } = body as {
      collectionId: string
      data: ListingData
    }

    requireString(collectionId, "Collection ID")
    requireField(data, "Listing data")
    requireString(data.titulo, "Listing title")
    requireString(data.endereco, "Listing address")

    const db = getDb()

    // Verify the collection belongs to the user
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionId),
          eq(collections.userId, session.user.id)
        )
      )

    requireResource(collection, "Collection")

    // Set addedAt if not provided
    const listingData: ListingData = {
      ...data,
      addedAt: data.addedAt || new Date().toISOString().split("T")[0],
    }

    const [newListing] = await db
      .insert(listings)
      .values({
        collectionId,
        data: listingData,
      })
      .returning()

    return successResponse({ listing: newListing }, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/listings")
  }
}
