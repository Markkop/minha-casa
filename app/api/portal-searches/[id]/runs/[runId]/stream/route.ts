import { NextRequest } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { backendHeaders, getBackendApiUrl } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

type RouteContext = { params: Promise<{ id: string; runId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const { id, runId } = await context.params
    const orgId = request.nextUrl.searchParams.get("orgId")
    await getWorkspaceProfile(orgId)

    const backendUrl = getBackendApiUrl()
    if (!backendUrl) {
      return new Response(JSON.stringify({ error: "Backend API not configured" }), {
        status: 503,
      })
    }

    const url = new URL(`/api/portal-searches/${id}/runs/${runId}/stream`, `${backendUrl}/`)
    const response = await fetch(url.toString(), {
      headers: backendHeaders(session.user.id, orgId),
    })

    if (!response.ok || !response.body) {
      const text = await response.text()
      return new Response(text, { status: response.status })
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return handleApiError(error, "GET /api/portal-searches/[id]/runs/[runId]/stream")
  }
}
