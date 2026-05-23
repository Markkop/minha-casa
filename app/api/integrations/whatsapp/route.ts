import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { backendHeaders, getBackendApiUrl } from "@/lib/backend-api"

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const backendUrl = getBackendApiUrl()
  if (!backendUrl) {
    return NextResponse.json({ linked: false })
  }

  const response = await fetch(`${backendUrl}/api/whatsapp/status`, {
    headers: backendHeaders(session.user.id),
  })

  const payload = await response.json().catch(() => ({ linked: false }))
  return NextResponse.json(payload, { status: response.status })
}
