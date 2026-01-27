import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, organizationMembers, type OrgMemberRole } from "@/lib/db"
import { eq, and, isNull } from "drizzle-orm"

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
 * GET /api/collections/[id]
 * Get a specific collection with its listings count
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

    const { collection, membership } = await verifyCollectionAccess(id, session.user.id)

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    // Get listings count
    const collectionListings = await db
      .select()
      .from(listings)
      .where(eq(listings.collectionId, id))

    return NextResponse.json({
      collection: {
        ...collection,
        listingsCount: collectionListings.length,
        userRole: membership?.role || null,
      },
    })
  } catch (error) {
    console.error("Error fetching collection:", error)
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/collections/[id]
 * Update a collection
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
    const { name, isDefault, isPublic } = body as {
      name?: string
      isDefault?: boolean
      isPublic?: boolean
    }

    const db = getDb()

    // Verify access using the helper
    const { collection: existingCollection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to edit this collection" },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: Partial<typeof collections.$inferInsert> = {}

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Collection name cannot be empty" },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (isPublic !== undefined) {
      updateData.isPublic = isPublic
    }

    if (isDefault !== undefined) {
      updateData.isDefault = isDefault
      // If setting as default, unset other defaults first - SCOPED BY CONTEXT
      if (isDefault) {
        if (existingCollection.orgId) {
          // Organization collection: only unset defaults for same org
          await db
            .update(collections)
            .set({ isDefault: false })
            .where(eq(collections.orgId, existingCollection.orgId))
        } else {
          // Personal collection: only unset defaults for user's personal collections
          await db
            .update(collections)
            .set({ isDefault: false })
            .where(
              and(
                eq(collections.userId, session.user.id),
                isNull(collections.orgId)
              )
            )
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    const [updatedCollection] = await db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, id))
      .returning()

    return NextResponse.json({ collection: updatedCollection })
  } catch (error) {
    console.error("Error updating collection:", error)
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collections/[id]
 * Delete a collection and all its listings
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

    // Verify access using the helper
    const { collection: existingCollection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to delete this collection" },
        { status: 403 }
      )
    }

    // Check if it's the only collection and is default - SCOPED BY CONTEXT
    if (existingCollection.isDefault) {
      let contextCollections
      if (existingCollection.orgId) {
        // Organization collection
        contextCollections = await db
          .select()
          .from(collections)
          .where(eq(collections.orgId, existingCollection.orgId))
      } else {
        // Personal collection
        contextCollections = await db
          .select()
          .from(collections)
          .where(
            and(
              eq(collections.userId, session.user.id),
              isNull(collections.orgId)
            )
          )
      }

      if (contextCollections.length === 1) {
        return NextResponse.json(
          { error: "Cannot delete the only default collection" },
          { status: 400 }
        )
      }
    }

    // Delete the collection (listings will be cascade deleted)
    await db.delete(collections).where(eq(collections.id, id))

    // If it was the default, set another collection as default - SCOPED BY CONTEXT
    if (existingCollection.isDefault) {
      let remainingCollections
      if (existingCollection.orgId) {
        // Organization collection
        remainingCollections = await db
          .select()
          .from(collections)
          .where(eq(collections.orgId, existingCollection.orgId))
          .limit(1)
      } else {
        // Personal collection
        remainingCollections = await db
          .select()
          .from(collections)
          .where(
            and(
              eq(collections.userId, session.user.id),
              isNull(collections.orgId)
            )
          )
          .limit(1)
      }

      if (remainingCollections.length > 0) {
        await db
          .update(collections)
          .set({ isDefault: true })
          .where(eq(collections.id, remainingCollections[0].id))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting collection:", error)
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    )
  }
}
