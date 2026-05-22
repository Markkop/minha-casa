import { NextRequest } from "next/server"
import { desc } from "drizzle-orm"
import { contacts, getDb, type ListingData } from "@/lib/db"
import {
  handleApiError,
  successResponse,
  ValidationError,
} from "@/lib/errors"
import {
  getProfileListings,
  getWorkspaceProfile,
  normalizePhoneNumber,
  profileValues,
  profileWhere,
  syncContactsFromListings,
} from "@/lib/workspace/profile"

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get("orgId")
    const profile = await getWorkspaceProfile(orgId)
    await syncContactsFromListings(profile)

    const db = getDb()
    const [rows, profileListings] = await Promise.all([
      db
        .select()
        .from(contacts)
        .where(profileWhere(contacts, profile))
        .orderBy(desc(contacts.updatedAt)),
      getProfileListings(profile),
    ])

    const listingMatches = new Map<string, { id: string; title: string }[]>()
    for (const listing of profileListings) {
      const data = listing.data as ListingData
      const normalized = normalizePhoneNumber(data.contactNumber)
      if (!normalized) continue
      const matches = listingMatches.get(normalized) ?? []
      matches.push({ id: listing.id, title: data.titulo })
      listingMatches.set(normalized, matches)
    }

    return successResponse({
      contacts: rows.map((contact) => ({
        ...contact,
        listings: contact.normalizedPhone
          ? listingMatches.get(contact.normalizedPhone) ?? []
          : [],
      })),
    })
  } catch (error) {
    return handleApiError(error, "GET /api/workspace/contacts")
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .insert(contacts)
      .values({
        ...profileValues(profile),
        name,
        phone,
        normalizedPhone: normalizePhoneNumber(phone),
        email,
        notes,
        source: "manual",
      })
      .returning()

    return successResponse({ contact }, 201)
  } catch (error) {
    return handleApiError(error, "POST /api/workspace/contacts")
  }
}
