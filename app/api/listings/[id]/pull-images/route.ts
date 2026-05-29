import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings, organizationMembers } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import type { ListingData } from "@/lib/db/schema"
import { enqueueListingImageIngestionOnBackend } from "@/lib/backend-listing-images"
import {
  handleApiError,
  successResponse,
  requireAuth,
  requireResource,
  ValidationError,
} from "@/lib/errors"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/listings/[id]/pull-images
 * Enqueues backend image scrape + download (overwrite existing gallery).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    requireAuth(session)

    const { id } = await params
    const db = getDb()

    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))

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

    const link = listing.data.link?.trim()
    if (!link) {
      throw new ValidationError(
        "Este imóvel não tem link do anúncio. Adicione a URL antes de buscar imagens.",
        { field: "link" }
      )
    }

    const backendUrl = process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_API_URL
    if (!backendUrl?.trim()) {
      return NextResponse.json(
        { error: "Backend de imagens não configurado." },
        { status: 503 }
      )
    }

    const pendingData: Partial<ListingData> = {
      imageIngestionStatus: "pending",
      imageIngestionError: null,
    }

    await db
      .update(listings)
      .set({
        data: { ...listing.data, ...pendingData },
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id))

    await enqueueListingImageIngestionOnBackend(
      id,
      session.user.id,
      collection.orgId,
      { overwrite: true }
    )

    return successResponse({ status: "pending" as const })
  } catch (error) {
    return handleApiError(error, "POST /api/listings/[id]/pull-images")
  }
}
