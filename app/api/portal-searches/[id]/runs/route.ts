import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const orgId = body.orgId ?? request.nextUrl.searchParams.get("orgId")
    await getWorkspaceProfile(orgId)

    const refresh = request.nextUrl.searchParams.get("refresh")

    const response = await proxyBackendRequest(`/api/portal-searches/${id}/runs`, {
      method: "POST",
      userId: session.user.id,
      orgId,
      isAdmin: session.user.isAdmin === true,
      body: { ...body, refresh: refresh === "true" },
      searchParams: refresh ? { refresh } : undefined,
    })

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "POST /api/portal-searches/[id]/runs")
  }
}
