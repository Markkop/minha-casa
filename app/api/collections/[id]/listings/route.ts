import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, organizationMembers, type ListingData } from "@/lib/db"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
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
 * GET /api/collections/[id]/listings
 * Get all listings for a collection
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

    // Verify access using the helper (all members can view)
    const { collection } = await verifyCollectionAccess(id, session.user.id)

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    const collectionListings = await db
      .select()
      .from(listings)
      .where(eq(listings.collectionId, id))
      .orderBy(listings.createdAt)

    return NextResponse.json({ listings: collectionListings })
  } catch (error) {
    console.error("Error fetching listings:", error)
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collections/[id]/listings
 * Add a new listing to a collection
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { data } = body as { data: ListingData }

    if (!data) {
      return NextResponse.json(
        { error: "Listing data is required" },
        { status: 400 }
      )
    }

    if (!data.titulo || typeof data.titulo !== "string") {
      return NextResponse.json(
        { error: "Listing title is required" },
        { status: 400 }
      )
    }

    if (!data.endereco || typeof data.endereco !== "string") {
      return NextResponse.json(
        { error: "Listing address is required" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Verify access using the helper - need edit permission to add listings
    const { collection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to add listings to this collection" },
        { status: 403 }
      )
    }

    // Set addedAt if not provided
    const listingData: ListingData = {
      ...data,
      addedAt: data.addedAt || new Date().toISOString().split("T")[0],
    }

    const [newListing] = await db
      .insert(listings)
      .values({
        collectionId: id,
        data: listingData,
      })
      .returning()

    return NextResponse.json(
      { listing: newListing },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating listing:", error)
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    )
  }
}
