import { and, eq, inArray, isNull } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { getServerSession } from "@/lib/auth-server"
import {
  collections,
  contacts,
  condominiums,
  getDb,
  listings,
  organizationMembers,
  type ListingData,
} from "@/lib/db"
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors"

export interface WorkspaceProfile {
  userId: string | null
  orgId: string | null
}

export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  return digits.length > 0 ? digits : null
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export async function getWorkspaceProfile(orgId?: string | null): Promise<WorkspaceProfile> {
  const session = await getServerSession()
  if (!session?.user) {
    throw new UnauthorizedError()
  }

  if (!orgId) {
    return { userId: session.user.id, orgId: null }
  }

  const db = getDb()
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, session.user.id)
      )
    )

  if (!membership) {
    throw new ForbiddenError("You are not a member of this organization")
  }

  return { userId: null, orgId }
}

export function profileWhere<
  T extends {
    userId: AnyPgColumn
    orgId: AnyPgColumn
  },
>(table: T, profile: WorkspaceProfile) {
  if (profile.orgId) {
    return eq(table.orgId, profile.orgId)
  }

  if (!profile.userId) {
    throw new ForbiddenError("Invalid workspace profile")
  }

  return and(eq(table.userId, profile.userId), isNull(table.orgId))
}

export function profileValues(profile: WorkspaceProfile) {
  return {
    userId: profile.userId,
    orgId: profile.orgId,
  }
}

export async function getProfileListings(profile: WorkspaceProfile) {
  const db = getDb()
  const profileCollections = await db
    .select({ id: collections.id })
    .from(collections)
    .where(profileWhere(collections, profile))

  if (profileCollections.length === 0) {
    return []
  }

  return db
    .select()
    .from(listings)
    .where(inArray(listings.collectionId, profileCollections.map((collection) => collection.id)))
}

export async function ensureListingInProfile(listingId: string, profile: WorkspaceProfile) {
  const db = getDb()
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))

  if (!listing) {
    throw new NotFoundError("Listing")
  }

  const [collection] = await db
    .select()
    .from(collections)
    .where(
      and(
        eq(collections.id, listing.collectionId),
        profileWhere(collections, profile)
      )
    )

  if (!collection) {
    throw new NotFoundError("Listing")
  }

  return listing
}

export async function syncContactsFromListings(profile: WorkspaceProfile) {
  const db = getDb()
  const profileListings = await getProfileListings(profile)
  const existingContacts = await db
    .select()
    .from(contacts)
    .where(profileWhere(contacts, profile))

  const existingPhones = new Set(
    existingContacts
      .map((contact) => contact.normalizedPhone)
      .filter((phone): phone is string => Boolean(phone))
  )

  const inserts = profileListings
    .map((listing) => {
      const data = listing.data as ListingData
      const normalizedPhone = normalizePhoneNumber(data.contactNumber)
      if (!normalizedPhone || existingPhones.has(normalizedPhone)) return null
      existingPhones.add(normalizedPhone)
      return {
        ...profileValues(profile),
        name: data.contactName ?? null,
        phone: data.contactNumber ?? null,
        normalizedPhone,
        source: "listing" as const,
      }
    })
    .filter((contact): contact is NonNullable<typeof contact> => Boolean(contact))

  if (inserts.length > 0) {
    await db.insert(contacts).values(inserts)
  }
}

export async function syncCondominiumsFromListings(profile: WorkspaceProfile) {
  const db = getDb()
  const profileListings = await getProfileListings(profile)
  const existingCondominiums = await db
    .select()
    .from(condominiums)
    .where(profileWhere(condominiums, profile))

  const existingNames = new Set(existingCondominiums.map((item) => normalizeName(item.name)))

  const inserts = profileListings
    .map((listing) => {
      const data = listing.data as ListingData
      const name = data.condominiumName?.trim()
      if (!name) return null

      const normalized = normalizeName(name)
      if (existingNames.has(normalized)) return null
      existingNames.add(normalized)

      return {
        ...profileValues(profile),
        name,
        city: data.cidade ?? null,
        neighborhood: data.bairro ?? null,
        address: data.endereco ?? null,
        propertyType: data.tipoImovel ?? null,
        source: "listing" as const,
      }
    })
    .filter((condominium): condominium is NonNullable<typeof condominium> => Boolean(condominium))

  if (inserts.length > 0) {
    await db.insert(condominiums).values(inserts)
  }
}
