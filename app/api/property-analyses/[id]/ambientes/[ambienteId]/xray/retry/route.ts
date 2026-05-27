import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

interface RouteParams {
  params: Promise<{ id: string; ambienteId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, ambienteId } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)

    const response = await proxyBackendRequest(
      `/api/property-analyses/${id}/ambientes/${encodeURIComponent(ambienteId)}/xray/retry`,
      {
        method: "POST",
        userId: session.user.id,
        orgId: profile.orgId,
      }
    )

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(
      error,
      "POST /api/property-analyses/[id]/ambientes/[ambienteId]/xray/retry"
    )
  }
}
