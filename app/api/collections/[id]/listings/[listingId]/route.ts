import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, organizationMembers, type ListingData } from "@/lib/db"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string; listingId: string }>
}

/**
 * Helper to verify user has access to a collection
 * Returns the collection and membership info if user has access
 */
async function verifyCollectionAccess(collectionId: string, userId: string) {
  const db = getDb()
  
  // First, get the collection
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
  
  if (!collection) {
    return { collection: null, membership: null, canEdit: false }
  }
  
  // Case 1: Personal collection - check if user owns it
  if (collection.userId && !collection.orgId) {
    if (collection.userId === userId) {
      return { collection, membership: null, canEdit: true }
    }
    return { collection: null, membership: null, canEdit: false }
  }
  
  // Case 2: Organization collection - check if user is a member
  if (collection.orgId) {
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, collection.orgId),
          eq(organizationMembers.userId, userId)
        )
      )
    
    if (!membership) {
      return { collection: null, membership: null, canEdit: false }
    }
    
    // Only owners and admins can edit organization collections
    const canEdit = membership.role === "owner" || membership.role === "admin"
    return { collection, membership, canEdit }
  }
  
  // Collection has neither userId nor orgId - shouldn't happen
  return { collection: null, membership: null, canEdit: false }
}

/**
 * GET /api/collections/[id]/listings/[listingId]
 * Get a specific listing
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

    const { id, listingId } = await params
    const db = getDb()

    // Verify access using the helper (all members can view)
    const { collection } = await verifyCollectionAccess(id, session.user.id)

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    const [listing] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.collectionId, id)
        )
      )

    if (!listing) {
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
 * PUT /api/collections/[id]/listings/[listingId]
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

    const { id, listingId } = await params
    const body = await request.json()
    const { data } = body as { data: Partial<ListingData> }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Update data is required" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Verify access using the helper - need edit permission to update listings
    const { collection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to edit listings in this collection" },
        { status: 403 }
      )
    }

    // Get existing listing
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.collectionId, id)
        )
      )

    if (!existingListing) {
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
      .where(eq(listings.id, listingId))
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
 * DELETE /api/collections/[id]/listings/[listingId]
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

    const { id, listingId } = await params
    const db = getDb()

    // Verify access using the helper - need edit permission to delete listings
    const { collection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to delete listings in this collection" },
        { status: 403 }
      )
    }

    // Verify the listing exists and belongs to this collection
    const [existingListing] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.collectionId, id)
        )
      )

    if (!existingListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      )
    }

    await db.delete(listings).where(eq(listings.id, listingId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting listing:", error)
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    )
  }
}
