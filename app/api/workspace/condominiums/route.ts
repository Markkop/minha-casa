import { NextRequest } from "next/server"
import { desc } from "drizzle-orm"
import { condominiums, getDb, type ListingData, type PropertyType } from "@/lib/db"
import {
  handleApiError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  getProfileListings,
  getWorkspaceProfile,
  normalizeName,
  profileValues,
  profileWhere,
  syncCondominiumsFromListings,
} from "@/lib/workspace/profile"

function parsePropertyType(value: unknown): PropertyType | null {
  if (value === "casa" || value === "apartamento") return value
  if (value === null || value === undefined || value === "") return null
  throw new ValidationError("Property type must be casa or apartamento")
}

function parseAmenities(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean)
  }
  return []
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    await syncCondominiumsFromListings(profile)

    const db = getDb()
    const [rows, profileListings] = await Promise.all([
      db
        .select()
        .from(condominiums)
        .where(profileWhere(condominiums, profile))
        .orderBy(desc(condominiums.updatedAt)),
      getProfileListings(profile),
    ])

    return successResponse({
      condominiums: rows.map((condominium) => {
        const normalized = normalizeName(condominium.name)
        const relatedListings = profileListings.filter((listing) => {
          const data = listing.data as ListingData
          return data.condominiumId === condominium.id ||
            (data.condominiumName ? normalizeName(data.condominiumName) === normalized : false)
        })
        return {
          ...condominium,
          listingCount: relatedListings.length,
          listings: relatedListings.map((listing) => ({
            id: listing.id,
            title: (listing.data as ListingData).titulo,
          })),
        }
      }),
    })
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/condominiums")
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) throw new ValidationError("Name is required")

    const db = getDb()
    const [condominium] = await db
      .insert(condominiums)
      .values({
        ...profileValues(profile),
        name,
        city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : null,
        neighborhood: typeof body.neighborhood === "string" && body.neighborhood.trim() ? body.neighborhood.trim() : null,
        address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
        propertyType: parsePropertyType(body.propertyType),
        amenities: parseAmenities(body.amenities),
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        source: "manual",
      })
      .returning()

    return successResponse({ condominium }, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/condominiums")
  }
}
