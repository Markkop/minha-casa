import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { getDb, savedLinks } from "@/lib/db"
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const updates: {
      title?: string
      url?: string
      description?: string | null
    } = {}

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : ""
      if (!title) throw new ValidationError("Title is required")
      updates.title = title
    }

    if (body.url !== undefined) {
      const url = typeof body.url === "string" ? body.url.trim() : ""
      if (!url) throw new ValidationError("URL is required")
      try {
        new URL(url)
      } catch {
        throw new ValidationError("URL must be valid")
      }
      updates.url = url
    }

    if (body.description !== undefined) {
      updates.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null
    }

    const db = getDb()
    const [link] = await db
      .update(savedLinks)
      .set(updates)
      .where(and(eq(savedLinks.id, id), profileWhere(savedLinks, profile)))
      .returning()

    if (!link) throw new NotFoundError("Saved link")
    return successResponse({ link })
  } catch (error) {
    return handleApiError(error, "PUT /api/workspace/saved-links/[id]")
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const db = getDb()
    const [link] = await db
      .delete(savedLinks)
      .where(and(eq(savedLinks.id, id), profileWhere(savedLinks, profile)))
      .returning()

    if (!link) throw new NotFoundError("Saved link")
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/workspace/saved-links/[id]")
  }
}
