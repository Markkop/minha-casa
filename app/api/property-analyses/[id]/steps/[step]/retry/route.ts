import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"
import { LISTING_ANALYSIS_PIPELINE_STEPS } from "@/lib/property-analysis/types"

interface RouteParams {
  params: Promise<{ id: string; step: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, step } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")

    if (
      !LISTING_ANALYSIS_PIPELINE_STEPS.includes(
        step as (typeof LISTING_ANALYSIS_PIPELINE_STEPS)[number]
      )
    ) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 })
    }

    const profile = await getWorkspaceProfile(orgId)

    const response = await proxyBackendRequest(
      `/api/property-analyses/${id}/steps/${step}/retry`,
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
      "POST /api/property-analyses/[id]/steps/[step]/retry"
    )
  }
}
