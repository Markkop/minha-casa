import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, type ListingData } from "@/lib/db"
import { eq, and } from "drizzle-orm"

/**
 * POST /api/listings
 * Create a new listing in a collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { collectionId, data } = body as {
      collectionId: string
      data: ListingData
    }

    if (!collectionId || typeof collectionId !== "string") {
      return NextResponse.json(
        { error: "Collection ID is required" },
        { status: 400 }
      )
    }

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

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
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
        collectionId,
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
