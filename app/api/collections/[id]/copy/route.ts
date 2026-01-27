import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, organizationMembers } from "@/lib/db"
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
 * POST /api/collections/[id]/copy
 * Copy a collection (and optionally its listings) to another profile
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
    const { targetOrgId, includeListings = true, newName } = body as {
      targetOrgId: string | null // null for personal, org ID for organization
      includeListings?: boolean
      newName?: string
    }

    const db = getDb()

    // Verify access to source collection (any member can view = can copy)
    const { collection: sourceCollection } = await verifyCollectionAccess(id, session.user.id)

    if (!sourceCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    // Verify user can create in target profile
    if (targetOrgId) {
      // Check if user is admin/owner in target org
      const [targetMembership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, targetOrgId),
            eq(organizationMembers.userId, session.user.id)
          )
        )

      if (!targetMembership) {
        return NextResponse.json(
          { error: "You are not a member of the target organization" },
          { status: 403 }
        )
      }

      if (targetMembership.role !== "owner" && targetMembership.role !== "admin") {
        return NextResponse.json(
          { error: "Only admins and owners can create collections in this organization" },
          { status: 403 }
        )
      }
    }

    // Create the new collection
    const collectionName = newName?.trim() || `${sourceCollection.name} (cópia)`
    
    const [newCollection] = await db
      .insert(collections)
      .values({
        userId: targetOrgId ? null : session.user.id,
        orgId: targetOrgId,
        name: collectionName,
        isPublic: false, // Start as private
        isDefault: false, // Never set as default
      })
      .returning()

    // Copy listings if requested
    let copiedListingsCount = 0
    if (includeListings) {
      const sourceListings = await db
        .select()
        .from(listings)
        .where(eq(listings.collectionId, id))

      if (sourceListings.length > 0) {
        await db.insert(listings).values(
          sourceListings.map((listing) => ({
            collectionId: newCollection.id,
            data: listing.data,
          }))
        )
        copiedListingsCount = sourceListings.length
      }
    }

    return NextResponse.json({
      collection: newCollection,
      copiedListingsCount,
    })
  } catch (error) {
    console.error("Error copying collection:", error)
    return NextResponse.json(
      { error: "Failed to copy collection" },
      { status: 500 }
    )
  }
}
