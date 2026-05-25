import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { proxyBackendRequest } from "@/lib/backend-api"
import { handleApiError } from "@/lib/errors"
import { getWorkspaceProfile } from "@/lib/workspace/profile"

export const maxDuration = 60

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const profile = await getWorkspaceProfile(
      typeof body === "object" && body && "orgId" in body
        ? (body.orgId as string | null)
        : null
    )

    const response = await proxyBackendRequest("/api/property-analyses", {
      method: "POST",
      userId: session.user.id,
      orgId: profile.orgId,
      body: {
        listingId: id,
        addressOverride:
          typeof body === "object" && body && "addressOverride" in body
            ? body.addressOverride
            : undefined,
        collectionId:
          typeof body === "object" && body && "collectionId" in body
            ? body.collectionId
            : undefined,
        force:
          typeof body === "object" && body && "force" in body
            ? body.force
            : true,
      },
    })

    const payload = await response.json().catch(() => ({}))
    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return handleApiError(error, "POST /api/listings/[id]/analyze")
  }
}
