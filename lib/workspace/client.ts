import { parseApiErrorResponse } from "@/lib/errors"

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseApiErrorResponse(response)
  }
  return response.json()
}

function withOrg(url: string, orgId?: string | null) {
  if (!orgId) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}orgId=${encodeURIComponent(orgId)}`
}

function withOrgBody<T extends Record<string, unknown>>(body: T, orgId?: string | null) {
  return orgId ? { ...body, orgId } : body
}

export interface SavedLink {
  id: string
  userId: string | null
  orgId: string | null
  title: string
  url: string
  description: string | null
  createdAt: string
  updatedAt: string
}

/** Client-only row state while metadata enrichment runs */
export type SavedLinkRow = SavedLink & {
  enriching?: boolean
  enrichError?: string | null
}

const ENRICH_LINK_TIMEOUT_MS = 58_000

export interface Contact {
  id: string
  userId: string | null
  orgId: string | null
  name: string | null
  phone: string | null
  normalizedPhone: string | null
  email: string | null
  notes: string | null
  source: "manual" | "listing"
  listings?: { id: string; title: string }[]
  createdAt: string
  updatedAt: string
}

export interface Region {
  id: string
  userId: string | null
  orgId: string | null
  city: string
  neighborhood: string
  propertyType: "casa" | "apartamento"
  pricePerM2: number
  notes: string | null
  listingCount?: number
  favoriteAveragePricePerM2?: number | null
  createdAt: string
  updatedAt: string
}

export interface Condominium {
  id: string
  userId: string | null
  orgId: string | null
  name: string
  city: string | null
  neighborhood: string | null
  address: string | null
  propertyType: "casa" | "apartamento" | null
  amenities: string[]
  notes: string | null
  source: "manual" | "listing"
  listingCount?: number
  listings?: { id: string; title: string }[]
  createdAt: string
  updatedAt: string
}

export interface ComparisonNote {
  id: string
  listingId: string
  pros: string[]
  cons: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchSavedLinks(orgId?: string | null) {
  return handleResponse<{ links: SavedLink[] }>(
    await fetch(withOrg("/api/workspace/saved-links", orgId))
  )
}

export async function createSavedLink(
  input: { url: string } | (Pick<SavedLink, "title" | "url"> & { description?: string | null }),
  orgId?: string | null
) {
  return handleResponse<{ link: SavedLink }>(
    await fetch("/api/workspace/saved-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOrgBody(input, orgId)),
    })
  )
}

export async function updateSavedLink(id: string, input: Pick<SavedLink, "title" | "url"> & { description?: string | null }, orgId?: string | null) {
  return handleResponse<{ link: SavedLink }>(
    await fetch(`/api/workspace/saved-links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOrgBody(input, orgId)),
    })
  )
}

export async function deleteSavedLink(id: string, orgId?: string | null) {
  return handleResponse<{ success: true }>(
    await fetch(withOrg(`/api/workspace/saved-links/${id}`, orgId), {
      method: "DELETE",
    })
  )
}

export async function enrichSavedLink(id: string, orgId?: string | null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ENRICH_LINK_TIMEOUT_MS)
  try {
    return await handleResponse<{ link: SavedLink }>(
      await fetch(`/api/workspace/saved-links/${id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withOrgBody({}, orgId)),
        signal: controller.signal,
      })
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchContacts(orgId?: string | null) {
  return handleResponse<{ contacts: Contact[] }>(
    await fetch(withOrg("/api/workspace/contacts", orgId))
  )
}

export async function saveContact(input: Partial<Contact>, orgId?: string | null, id?: string) {
  return handleResponse<{ contact: Contact }>(
    await fetch(id ? `/api/workspace/contacts/${id}` : "/api/workspace/contacts", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOrgBody(input, orgId)),
    })
  )
}

export async function deleteContact(id: string, orgId?: string | null) {
  return handleResponse<{ success: true }>(
    await fetch(withOrg(`/api/workspace/contacts/${id}`, orgId), {
      method: "DELETE",
    })
  )
}

export async function fetchRegions(orgId?: string | null) {
  return handleResponse<{ regions: Region[] }>(
    await fetch(withOrg("/api/workspace/regions", orgId))
  )
}

export async function saveRegion(input: Partial<Region>, orgId?: string | null, id?: string) {
  return handleResponse<{ region: Region }>(
    await fetch(id ? `/api/workspace/regions/${id}` : "/api/workspace/regions", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOrgBody(input, orgId)),
    })
  )
}

export async function deleteRegion(id: string, orgId?: string | null) {
  return handleResponse<{ success: true }>(
    await fetch(withOrg(`/api/workspace/regions/${id}`, orgId), {
      method: "DELETE",
    })
  )
}

export async function fetchCondominiums(orgId?: string | null) {
  return handleResponse<{ condominiums: Condominium[] }>(
    await fetch(withOrg("/api/workspace/condominiums", orgId))
  )
}

export async function saveCondominium(input: Partial<Condominium>, orgId?: string | null, id?: string) {
  return handleResponse<{ condominium: Condominium }>(
    await fetch(id ? `/api/workspace/condominiums/${id}` : "/api/workspace/condominiums", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOrgBody(input, orgId)),
    })
  )
}

export async function deleteCondominium(id: string, orgId?: string | null) {
  return handleResponse<{ success: true }>(
    await fetch(withOrg(`/api/workspace/condominiums/${id}`, orgId), {
      method: "DELETE",
    })
  )
}

export async function fetchComparisonNotes(orgId?: string | null) {
  return handleResponse<{ notes: ComparisonNote[] }>(
    await fetch(withOrg("/api/workspace/comparison-notes", orgId))
  )
}

export async function saveComparisonNote(
  input: Pick<ComparisonNote, "listingId" | "pros" | "cons"> & { notes?: string | null },
  orgId?: string | null
) {
  return handleResponse<{ note: ComparisonNote }>(
    await fetch("/api/workspace/comparison-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withOrgBody(input, orgId)),
    })
  )
}
