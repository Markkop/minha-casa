import { NextRequest } from "next/server"
import { eq, inArray } from "drizzle-orm"
import {
  getDb,
  listingComparisonNotes,
} from "@/lib/db"
import {
  handleApiError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  ensureListingInProfile,
  getProfileListings,
  getWorkspaceProfile,
} from "@/lib/workspace/profile"

function parseTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const profileListings = await getProfileListings(profile)

    if (profileListings.length === 0) {
      return successResponse({ notes: [] })
    }

    const db = getDb()
    const notes = await db
      .select()
      .from(listingComparisonNotes)
      .where(inArray(listingComparisonNotes.listingId, profileListings.map((listing) => listing.id)))

    return successResponse({ notes })
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/comparison-notes")
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    if (!listingId) throw new ValidationError("Listing ID is required")

    await ensureListingInProfile(listingId, profile)

    const db = getDb()
    const values = {
      listingId,
      pros: parseTextList(body.pros),
      cons: parseTextList(body.cons),
      notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
    }

    const [existing] = await db
      .select()
      .from(listingComparisonNotes)
      .where(eq(listingComparisonNotes.listingId, listingId))

    if (existing) {
      const [comparisonNote] = await db
        .update(listingComparisonNotes)
        .set(values)
        .where(eq(listingComparisonNotes.listingId, listingId))
        .returning()
      return successResponse({ note: comparisonNote })
    }

    const [comparisonNote] = await db
      .insert(listingComparisonNotes)
      .values(values)
      .returning()

    return successResponse({ note: comparisonNote }, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/comparison-notes")
  }
}
