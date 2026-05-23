import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, listings } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { scrapeUrlPage, ScrapingAntError } from "@/lib/scrapingant"
import { syncListingImageFields } from "@/lib/listing-images"
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

export const maxDuration = 60

/**
 * POST /api/listings/[id]/pull-images
 * Re-scrapes listing link and returns image URLs (preview; client persists on confirm).
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
      .where(
        and(
          eq(collections.id, listing.collectionId),
          eq(collections.userId, session.user.id)
        )
      )

    requireResource(collection, "Listing")

    const link = listing.data.link?.trim()
    if (!link) {
      throw new ValidationError(
        "Este imóvel não tem link do anúncio. Adicione a URL antes de buscar imagens.",
        { field: "link" }
      )
    }

    const scraped = await scrapeUrlPage(link)
    const synced = syncListingImageFields(scraped.imageUrls)

    return successResponse({
      imageUrls: synced.imageUrls,
      imageUrl: synced.imageUrl,
      imageCount: synced.imageUrls.length,
    })
  } catch (error) {
    if (error instanceof ScrapingAntError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof Error && error.message === "INVALID_URL") {
      return NextResponse.json(
        { error: "Link do anúncio inválido." },
        { status: 400 }
      )
    }
    return handleApiError(error, "POST /api/listings/[id]/pull-images")
  }
}
