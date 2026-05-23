import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { backendHeaders, getBackendApiUrl } from "@/lib/backend-api"

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const backendUrl = getBackendApiUrl()
  if (!backendUrl) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const code = body.code?.trim()
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 })
  }

  const response = await fetch(`${backendUrl}/api/telegram/link`, {
    method: "POST",
    headers: backendHeaders(session.user.id),
    body: JSON.stringify({ code }),
  })

  const payload = await response.json().catch(() => ({ error: "Invalid backend response" }))
  return NextResponse.json(payload, { status: response.status })
}
