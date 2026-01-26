import { NextRequest, NextResponse } from "next/server"
import { getDb, collections, listings } from "@/lib/db"
import { eq } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/shared/[token]
 * Public endpoint to access a shared collection and its listings
 * Does not require authentication
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: "Token é obrigatório" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Find the collection by share token
    const [sharedCollection] = await db
      .select()
      .from(collections)
      .where(eq(collections.shareToken, token))

    if (!sharedCollection) {
      return NextResponse.json(
        { error: "Coleção compartilhada não encontrada" },
        { status: 404 }
      )
    }

    // Verify the collection is public
    if (!sharedCollection.isPublic) {
      return NextResponse.json(
        { error: "Esta coleção não está mais compartilhada" },
        { status: 403 }
      )
    }

    // Fetch the listings for this collection
    const collectionListings = await db
      .select()
      .from(listings)
      .where(eq(listings.collectionId, sharedCollection.id))
      .orderBy(listings.createdAt)

    return NextResponse.json({
      success: true,
      collection: {
        id: sharedCollection.id,
        name: sharedCollection.name,
        createdAt: sharedCollection.createdAt,
        updatedAt: sharedCollection.updatedAt,
      },
      listings: collectionListings.map((listing) => ({
        id: listing.id,
        data: listing.data,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      })),
      metadata: {
        totalListings: collectionListings.length,
      },
    })
  } catch (error) {
    console.error("Error fetching shared collection:", error)
    return NextResponse.json(
      { error: "Erro ao carregar coleção compartilhada" },
      { status: 500 }
    )
  }
}
