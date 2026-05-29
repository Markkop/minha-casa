import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

type RouteContext = { params: Promise<{ id: string; runId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, runId } = await context.params
    const orgId = request.nextUrl.searchParams.get("orgId")
    await getWorkspaceProfile(orgId)

    const response = await proxyBackendRequest(
      `/api/portal-searches/${id}/runs/${runId}/cost`,
      {
        method: "GET",
        userId: session.user.id,
        orgId,
      }
    )

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "GET /api/portal-searches/[id]/runs/[runId]/cost")
  }
}
