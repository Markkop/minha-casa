import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { contacts, getDb } from "@/lib/db"
import {
  handleApiError,
  NotFoundError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  getWorkspaceProfile,
  normalizePhoneNumber,
  profileWhere,
} from "@/lib/workspace/profile"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const profile = await getWorkspaceProfile(body.orgId)
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null

    if (!name && !phone && !email) {
      throw new ValidationError("Name, phone or email is required")
    }

    const db = getDb()
    const [contact] = await db
      .update(contacts)
      .set({
        name,
        phone,
        normalizedPhone: normalizePhoneNumber(phone),
        email,
        notes,
        source: "manual",
      })
      .where(and(eq(contacts.id, id), profileWhere(contacts, profile)))
      .returning()

    if (!contact) throw new NotFoundError("Contact")
    return successResponse({ contact })
  } catch (error) {
    return handleApiError(error, "PUT /api/workspace/contacts/[id]")
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    const db = getDb()
    const [contact] = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), profileWhere(contacts, profile)))
      .returning()

    if (!contact) throw new NotFoundError("Contact")
    return successResponse({ success: true })
  } catch (error) {
    return handleApiError(error, "DELETE /api/workspace/contacts/[id]")
  }
}
