import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { getDb, savedLinks } from "@/lib/db"
import {
  handleApiError,
  NotFoundError,
  successResponse,
} from "@/lib/errors"
import { resolveSavedLinkMetadata } from "@/lib/saved-link-enrichment"
import {
  getWorkspaceProfile,
  profileWhere,
} from "@/lib/workspace/profile"

export const maxDuration = 60

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const profile = await getWorkspaceProfile(
      typeof body === "object" && body && "orgId" in body
        ? (body.orgId as string | null)
        : null
    )

    const db = getDb()
    const [existing] = await db
      .select()
      .from(savedLinks)
      .where(and(eq(savedLinks.id, id), profileWhere(savedLinks, profile)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError("Saved link")
    }

    let title = existing.title
    let description = existing.description

    try {
      const resolved = await resolveSavedLinkMetadata(existing.url)
      title = resolved.title
      description = resolved.description
    } catch (error) {
      console.error("[POST /api/workspace/saved-links/[id]/enrich] enrichment failed:", error)
    }

    const [link] = await db
      .update(savedLinks)
      .set({ title, description })
      .where(and(eq(savedLinks.id, id), profileWhere(savedLinks, profile)))
      .returning()

    if (!link) {
      throw new NotFoundError("Saved link")
    }

    return successResponse({ link })
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/saved-links/[id]/enrich")
  }
}
