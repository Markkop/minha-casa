import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { condominiums, getDb, type PropertyType } from "@/lib/db"
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) throw new ValidationError("Name is required")

    const db = getDb()
    const [condominium] = await db
      .update(condominiums)
      .set({
        name,
        city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : null,
        neighborhood: typeof body.neighborhood === "string" && body.neighborhood.trim() ? body.neighborhood.trim() : null,
        address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
        propertyType: parsePropertyType(body.propertyType),
        amenities: parseAmenities(body.amenities),
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        source: "manual",
      })
      .where(and(eq(condominiums.id, id), profileWhere(condominiums, profile)))
      .returning()

    if (!condominium) throw new NotFoundError("Condominium")
    return successResponse({ condominium })
  } catch (error) {
    return handleApiError(error, "PUT /api/workspace/condominiums/[id]")
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const db = getDb()
    const [condominium] = await db
      .delete(condominiums)
      .where(and(eq(condominiums.id, id), profileWhere(condominiums, profile)))
      .returning()

    if (!condominium) throw new NotFoundError("Condominium")
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/workspace/condominiums/[id]")
  }
}
