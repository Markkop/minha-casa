import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

const REVALIDATE_SEC = 60 * 60 * 24 * 7

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const cacheScope = profile.orgId ?? session.user.id

    const loadNearby = unstable_cache(
      async () => {
        const response = await proxyBackendRequest(
          `/api/listings/${id}/nearby`,
          {
            method: "GET",
            userId: session.user.id,
            orgId: profile.orgId,
          }
        )
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "Failed to load nearby places"
          )
        }
        return payload
      },
      ["listing-nearby", id, cacheScope],
      { revalidate: REVALIDATE_SEC }
    )

    const payload = await loadNearby()

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `private, max-age=${REVALIDATE_SEC}`,
      },
    })
  } catch (error) {
    return handleApiError(error, "GET /api/listings/[id]/nearby")
  }
}
