import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, organizationMembers } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { fetchListingImageFromBackend } from "@/lib/backend-listing-images"
import { requireAuth, requireResource } from "@/lib/errors"

interface RouteParams {
  params: Promise<{ id: string; index: string }>
}

/**
 * GET /api/listings/[id]/images/[index]
 * Streams a hosted listing image (proxied from Phoenix/MinIO).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    requireAuth(session)

    const { id, index } = await params
    const imageIndex = Number.parseInt(index, 10)
    if (!Number.isInteger(imageIndex) || imageIndex < 0) {
      return NextResponse.json({ error: "Invalid image index" }, { status: 400 })
    }

    const db = getDb()
    const [listing] = await db.select().from(listings).where(eq(listings.id, id))
    requireResource(listing, "Listing")

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, listing.collectionId))

    requireResource(collection, "Listing")

    const canAccess =
      (collection.userId && collection.userId === session.user.id) ||
      (collection.orgId &&
        (await db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, collection.orgId),
              eq(organizationMembers.userId, session.user.id)
            )
          )
          .limit(1)).length > 0)

    if (!canAccess) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const backendResponse = await fetchListingImageFromBackend(
      id,
      imageIndex,
      session.user.id,
      collection.orgId
    )

    if (!backendResponse) {
      return NextResponse.json(
        { error: "Backend de imagens não configurado." },
        { status: 503 }
      )
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: backendResponse.status === 401 ? 401 : 404 }
      )
    }

    const body = await backendResponse.arrayBuffer()
    const contentType =
      backendResponse.headers.get("content-type") ?? "image/jpeg"

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("GET /api/listings/[id]/images/[index]", error)
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 })
  }
}
