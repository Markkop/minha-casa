import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { getDb, regions, type PropertyType } from "@/lib/db"
import {
  handleApiError,
  NotFoundError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  getWorkspaceProfile,
  profileWhere,
} from "@/lib/workspace/profile"

interface RouteParams {
  params: Promise<{ id: string }>
}

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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
      .update(regions)
      .set({
        city,
        neighborhood,
        propertyType,
        pricePerM2,
        notes,
      })
      .where(and(eq(regions.id, id), profileWhere(regions, profile)))
      .returning()

    if (!region) throw new NotFoundError("Region")
    return successResponse({ region })
  } catch (error) {
    return handleApiError(error, "PUT /api/workspace/regions/[id]")
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const db = getDb()
    const [region] = await db
      .delete(regions)
      .where(and(eq(regions.id, id), profileWhere(regions, profile)))
      .returning()

    if (!region) throw new NotFoundError("Region")
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/workspace/regions/[id]")
  }
}
