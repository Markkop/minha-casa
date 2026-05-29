import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { clampPages } from "@/lib/portal-search/limits"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

type RouteContext = { params: Promise<{ id: string }> }

function sanitizePortalSearchBody(body: Record<string, unknown>, isAdmin: boolean) {
  const next = { ...body }

  if ("maxPages" in next) {
    const requested =
      typeof next.maxPages === "number"
        ? next.maxPages
        : typeof next.maxPages === "string"
          ? Number.parseInt(next.maxPages, 10)
          : 1

    if (!isAdmin && requested > 1) {
      return {
        error: NextResponse.json(
          { error: "Only admins can request more than one page" },
          { status: 403 }
        ),
      }
    }

    next.maxPages = clampPages(Number.isFinite(requested) ? requested : 1, isAdmin)
  }

  return { body: next }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const orgId = request.nextUrl.searchParams.get("orgId")
    await getWorkspaceProfile(orgId)

    const response = await proxyBackendRequest(`/api/portal-searches/${id}`, {
      method: "GET",
      userId: session.user.id,
      orgId,
      isAdmin: session.user.isAdmin === true,
    })

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "GET /api/portal-searches/[id]")
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    await getWorkspaceProfile(body.orgId as string | null | undefined)

    const isAdmin = session.user.isAdmin === true
    const sanitized = sanitizePortalSearchBody(body, isAdmin)
    if ("error" in sanitized) return sanitized.error

    const response = await proxyBackendRequest(`/api/portal-searches/${id}`, {
      method: "PATCH",
      userId: session.user.id,
      orgId: body.orgId as string | null | undefined,
      isAdmin,
      body: sanitized.body,
    })

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "PATCH /api/portal-searches/[id]")
  }
}
