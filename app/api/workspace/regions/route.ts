import { NextRequest } from "next/server"
import { desc } from "drizzle-orm"
import { getDb, regions, type ListingData, type PropertyType } from "@/lib/db"
import {
  handleApiError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  getProfileListings,
  getWorkspaceProfile,
  profileValues,
  profileWhere,
} from "@/lib/workspace/profile"

function parsePropertyType(value: unknown): PropertyType {
  if (value === "casa" || value === "apartamento") return value
  throw new ValidationError("Property type must be casa or apartamento")
}

function parsePricePerM2(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError("Price per m2 must be a positive number")
  }
  return Math.round(parsed)
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const db = getDb()
    const [rows, profileListings] = await Promise.all([
      db
        .select()
        .from(regions)
        .where(profileWhere(regions, profile))
        .orderBy(desc(regions.updatedAt)),
      getProfileListings(profile),
    ])

    return successResponse({
      regions: rows.map((region) => {
        const regionListings = profileListings.filter((listing) => {
          const data = listing.data as ListingData
          return data.regionId === region.id
        })
        const favoritePrices = regionListings
          .map((listing) => listing.data as ListingData)
          .filter((data) => data.starred && !data.strikethrough)
          .map((data) => {
            const area = data.m2Privado ?? data.m2Totais
            if (!data.preco || !area) return null
            return data.preco / area
          })
          .filter((value): value is number => value !== null)
        const favoriteAveragePricePerM2 =
          favoritePrices.length > 0
            ? Math.round(favoritePrices.reduce((sum, value) => sum + value, 0) / favoritePrices.length)
            : null

        return {
          ...region,
          listingCount: regionListings.length,
          favoriteAveragePricePerM2,
        }
      }),
    })
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/regions")
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const city = typeof body.city === "string" ? body.city.trim() : ""
    const neighborhood = typeof body.neighborhood === "string" ? body.neighborhood.trim() : ""
    const propertyType = parsePropertyType(body.propertyType)
    const pricePerM2 = parsePricePerM2(body.pricePerM2)
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null

    if (!city) throw new ValidationError("City is required")
    if (!neighborhood) throw new ValidationError("Neighborhood is required")

    const db = getDb()
    const [region] = await db
      .insert(regions)
      .values({
        ...profileValues(profile),
        city,
        neighborhood,
        propertyType,
        pricePerM2,
        notes,
      })
      .returning()

    return successResponse({ region }, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/regions")
  }
}
