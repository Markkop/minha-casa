import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = request.nextUrl.searchParams.get("orgId")
    await getWorkspaceProfile(orgId)

    const response = await proxyBackendRequest("/api/saved-links", {
      method: "GET",
      userId: session.user.id,
      orgId,
      searchParams: orgId ? { orgId } : undefined,
    })

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/saved-links")
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    await getWorkspaceProfile(body.orgId)

    const response = await proxyBackendRequest("/api/saved-links", {
      method: "POST",
      userId: session.user.id,
      orgId: body.orgId,
      body,
    })

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/saved-links")
  }
}
