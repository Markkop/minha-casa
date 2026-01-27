import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, organizationMembers } from "@/lib/db"
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
 * Generate a unique share token (16 characters, alphanumeric)
 */
function generateShareToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * POST /api/collections/[id]/share
 * Generate a share token for a collection
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
    const db = getDb()

    // Verify access using the helper - need edit permission to share
    const { collection: existingCollection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to share this collection" },
        { status: 403 }
      )
    }

    // If already shared, return existing token
    if (existingCollection.shareToken) {
      const baseUrl = request.nextUrl.origin
      const shareUrl = `${baseUrl}/anuncios?share=${existingCollection.shareToken}`

      return NextResponse.json({
        collection: existingCollection,
        shareUrl,
      })
    }

    // Generate a new share token
    const shareToken = generateShareToken()

    const [updatedCollection] = await db
      .update(collections)
      .set({
        shareToken,
        isPublic: true,
      })
      .where(eq(collections.id, id))
      .returning()

    const baseUrl = request.nextUrl.origin
    const shareUrl = `${baseUrl}/anuncios?share=${shareToken}`

    return NextResponse.json({
      collection: updatedCollection,
      shareUrl,
    })
  } catch (error) {
    console.error("Error creating share:", error)
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collections/[id]/share
 * Revoke sharing for a collection
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

    // Verify access using the helper - need edit permission to revoke sharing
    const { collection: existingCollection, canEdit } = await verifyCollectionAccess(id, session.user.id)

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (!canEdit) {
      return NextResponse.json(
        { error: "You don't have permission to revoke sharing for this collection" },
        { status: 403 }
      )
    }

    // Remove share token
    const [updatedCollection] = await db
      .update(collections)
      .set({
        shareToken: null,
        isPublic: false,
      })
      .where(eq(collections.id, id))
      .returning()

    return NextResponse.json({
      collection: updatedCollection,
      success: true,
    })
  } catch (error) {
    console.error("Error revoking share:", error)
    return NextResponse.json(
      { error: "Failed to revoke share link" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/collections/[id]/share
 * Get share status for a collection
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

    // Verify access using the helper (all members can view share status)
    const { collection: existingCollection } = await verifyCollectionAccess(id, session.user.id)

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    if (existingCollection.shareToken) {
      const baseUrl = request.nextUrl.origin
      const shareUrl = `${baseUrl}/anuncios?share=${existingCollection.shareToken}`

      return NextResponse.json({
        isShared: true,
        shareToken: existingCollection.shareToken,
        shareUrl,
      })
    }

    return NextResponse.json({
      isShared: false,
      shareToken: null,
      shareUrl: null,
    })
  } catch (error) {
    console.error("Error getting share status:", error)
    return NextResponse.json(
      { error: "Failed to get share status" },
      { status: 500 }
    )
  }
}
