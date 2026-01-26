import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings } from "@/lib/db"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
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

    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, id),
          eq(collections.userId, session.user.id)
        )
      )

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

    // Verify the collection belongs to the user
    const [existingCollection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, id),
          eq(collections.userId, session.user.id)
        )
      )

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
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
      // If setting as default, unset other defaults first
      if (isDefault) {
        await db
          .update(collections)
          .set({ isDefault: false })
          .where(eq(collections.userId, session.user.id))
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

    // Verify the collection belongs to the user
    const [existingCollection] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.id, id),
          eq(collections.userId, session.user.id)
        )
      )

    if (!existingCollection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      )
    }

    // Check if it's the only collection and is default
    if (existingCollection.isDefault) {
      const userCollections = await db
        .select()
        .from(collections)
        .where(eq(collections.userId, session.user.id))

      if (userCollections.length === 1) {
        return NextResponse.json(
          { error: "Cannot delete the only default collection" },
          { status: 400 }
        )
      }
    }

    // Delete the collection (listings will be cascade deleted)
    await db.delete(collections).where(eq(collections.id, id))

    // If it was the default, set another collection as default
    if (existingCollection.isDefault) {
      const [firstCollection] = await db
        .select()
        .from(collections)
        .where(eq(collections.userId, session.user.id))
        .limit(1)

      if (firstCollection) {
        await db
          .update(collections)
          .set({ isDefault: true })
          .where(eq(collections.id, firstCollection.id))
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
