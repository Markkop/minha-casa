import { NextRequest, NextResponse } from "next/server"
import { getDb, collections, listings } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { fetchListingImageFromBackend } from "@/lib/backend-listing-images"

interface RouteParams {
  params: Promise<{ token: string; listingId: string; index: string }>
}

/**
 * GET /api/shared/[token]/listings/[listingId]/images/[index]
 * Public share access to a hosted listing image.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token, listingId, index } = await params
    const imageIndex = Number.parseInt(index, 10)

    if (!token || !Number.isInteger(imageIndex) || imageIndex < 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const db = getDb()
    const [sharedCollection] = await db
      .select()
      .from(collections)
      .where(eq(collections.shareToken, token))

    if (!sharedCollection?.isPublic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const [listing] = await db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.collectionId, sharedCollection.id)
        )
      )

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const backendResponse = await fetchListingImageFromBackend(
      listingId,
      imageIndex
    )

    if (!backendResponse) {
      return NextResponse.json(
        { error: "Backend de imagens não configurado." },
        { status: 503 }
      )
    }

    if (!backendResponse.ok) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const body = await backendResponse.arrayBuffer()
    const contentType =
      backendResponse.headers.get("content-type") ?? "image/jpeg"

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (error) {
    console.error("GET /api/shared/.../images/[index]", error)
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 })
  }
}
