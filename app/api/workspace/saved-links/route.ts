import { NextRequest } from "next/server"
import { desc } from "drizzle-orm"
import { getDb, savedLinks } from "@/lib/db"
import {
  handleApiError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  getWorkspaceProfile,
  profileValues,
  profileWhere,
} from "@/lib/workspace/profile"

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const db = getDb()
    const links = await db
      .select()
      .from(savedLinks)
      .where(profileWhere(savedLinks, profile))
      .orderBy(desc(savedLinks.updatedAt))

    return successResponse({ links })
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/saved-links")
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const url = typeof body.url === "string" ? body.url.trim() : ""
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null

    if (!url) {
      throw new ValidationError("URL is required")
    }

    try {
      new URL(url)
    } catch {
      throw new ValidationError("URL must be valid")
    }

    const db = getDb()
    const [link] = await db
      .insert(savedLinks)
      .values({
        ...profileValues(profile),
        title: title || url,
        url,
        description,
      })
      .returning()

    return successResponse({ link }, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/saved-links")
  }
}
