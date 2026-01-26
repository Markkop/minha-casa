import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, type ListingData } from "@/lib/db"
import { eq, and } from "drizzle-orm"

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
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const db = getDb()

    // Get the listing
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

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

    if (!collection) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ listing })
  } catch (error) {
    console.error("Error fetching listing:", error)
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/listings/[id]
 * Update a listing
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { data } = body as { data: Partial<ListingData> }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Update data is required" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Get the listing
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

    if (!existingListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

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

    if (!collection) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

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

    return NextResponse.json({ listing: updatedListing })
  } catch (error) {
    console.error("Error updating listing:", error)
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/listings/[id]
 * Delete a listing
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const db = getDb()

    // Get the listing
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

    if (!existingListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

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

    if (!collection) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    await db.delete(listings).where(eq(listings.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting listing:", error)
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    )
  }
}
