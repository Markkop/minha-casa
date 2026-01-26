import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, type ListingData } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import {
  handleApiError,
  successResponse,
  requireAuth,
  requireResource,
  ValidationError,
} from "@/lib/errors"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/listings/[id]
 * Get a specific listing by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    requireAuth(session)

    const { id } = await params
    const db = getDb()

    // Get the listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

    requireResource(listing, "Listing")

    // Verify the collection belongs to the user
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, listing.collectionId),
          eq(collections.userId, session.user.id)
        )
      )

    requireResource(collection, "Listing")

    return successResponse({ listing })
  } catch (error) {
    return handleApiError(error, "GET /api/listings/[id]")
  }
}

/**
 * PUT /api/listings/[id]
 * Update a listing
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    requireAuth(session)

    const { id } = await params
    const body = await request.json()
    const { data } = body as { data: Partial<ListingData> }

    if (!data || Object.keys(data).length === 0) {
      throw new ValidationError("Update data is required", { field: "data" })
    }

    const db = getDb()

    // Get the listing
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

    requireResource(existingListing, "Listing")

    // Verify the collection belongs to the user
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, existingListing.collectionId),
          eq(collections.userId, session.user.id)
        )
      )

    requireResource(collection, "Listing")

    // Merge existing data with updates
    const updatedData: ListingData = {
      ...existingListing.data,
      ...data,
    }

    const [updatedListing] = await db
      .update(listings)
      .set({ data: updatedData })
      .where(eq(listings.id, id))
      .returning()

    return successResponse({ listing: updatedListing })
  } catch (error) {
    return handleApiError(error, "PUT /api/listings/[id]")
  }
}

/**
 * DELETE /api/listings/[id]
 * Delete a listing
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    requireAuth(session)

    const { id } = await params
    const db = getDb()

    // Get the listing
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

    requireResource(existingListing, "Listing")

    // Verify the collection belongs to the user
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, existingListing.collectionId),
          eq(collections.userId, session.user.id)
        )
      )

    requireResource(collection, "Listing")

    await db.delete(listings).where(eq(listings.id, id))

    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/listings/[id]")
  }
}
