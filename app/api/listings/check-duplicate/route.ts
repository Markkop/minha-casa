import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { backendHeaders, getBackendApiUrl } from "@/lib/backend-api"
import type { ListingData } from "@/lib/db/schema"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const backendUrl = getBackendApiUrl()
    if (!backendUrl) {
      return NextResponse.json(
        { error: "Backend API not configured" },
        { status: 503 }
      )
    }

    const body = (await request.json()) as {
      collectionId?: string
      data?: ListingData
      orgId?: string | null
    }

    if (!body.collectionId || !body.data) {
      return NextResponse.json(
        { error: "collectionId and data are required" },
        { status: 400 }
      )
    }

    const response = await fetch(`${backendUrl}/api/listings/check-duplicate`, {
      method: "POST",
      headers: backendHeaders(session.user.id, body.orgId ?? null),
      body: JSON.stringify({
        collectionId: body.collectionId,
        data: body.data,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        payload.error ? { error: payload.error } : payload,
        { status: response.status }
      )
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("check-duplicate error:", error)
    return NextResponse.json(
      { error: "Failed to check duplicates" },
      { status: 500 }
    )
  }
}
