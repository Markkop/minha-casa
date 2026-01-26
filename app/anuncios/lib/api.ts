/**
 * API Client for Collections and Listings
 *
 * This module provides functions to interact with the server-side APIs
 * for collections and listings management, replacing localStorage operations.
 */

import type { ListingData } from "@/lib/db/schema"

// ============================================================================
// TYPES
// ============================================================================

export interface ApiCollection {
  id: string
  userId: string | null
  orgId: string | null
  name: string
  isPublic: boolean
  shareToken: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiListing {
  id: string
  collectionId: string
  data: ListingData
  createdAt: string
  updatedAt: string
}

// Frontend-compatible types (matching storage.ts interface)
export interface Collection {
  id: string
  label: string
  createdAt: string
  updatedAt: string
  isDefault: boolean
}

export interface Imovel {
  id: string
  titulo: string
  endereco: string
  m2Totais: number | null
  m2Privado: number | null
  quartos: number | null
  suites: number | null
  banheiros: number | null
  garagem: number | null
  preco: number | null
  precoM2: number | null
  piscina: boolean | null
  porteiro24h: boolean | null
  academia: boolean | null
  vistaLivre: boolean | null
  piscinaTermica: boolean | null
  andar?: number | null
  tipoImovel?: "casa" | "apartamento" | null
  link: string | null
  imageUrl?: string | null
  contactName?: string | null
  contactNumber?: string | null
  starred?: boolean
  visited?: boolean
  strikethrough?: boolean
  discardedReason?: string | null
  customLat?: number | null
  customLng?: number | null
  createdAt: string
  addedAt?: string
}

export interface ApiError {
  error: string
  status?: number
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert API collection to frontend Collection format
 */
export function toCollection(apiCollection: ApiCollection): Collection {
  return {
    id: apiCollection.id,
    label: apiCollection.name,
    createdAt: apiCollection.createdAt,
    updatedAt: apiCollection.updatedAt,
    isDefault: apiCollection.isDefault,
  }
}

/**
 * Convert API listing to frontend Imovel format
 */
export function toImovel(apiListing: ApiListing): Imovel {
  return {
    id: apiListing.id,
    titulo: apiListing.data.titulo,
    endereco: apiListing.data.endereco,
    m2Totais: apiListing.data.m2Totais,
    m2Privado: apiListing.data.m2Privado,
    quartos: apiListing.data.quartos,
    suites: apiListing.data.suites,
    banheiros: apiListing.data.banheiros,
    garagem: apiListing.data.garagem,
    preco: apiListing.data.preco,
    precoM2: apiListing.data.precoM2,
    piscina: apiListing.data.piscina,
    porteiro24h: apiListing.data.porteiro24h,
    academia: apiListing.data.academia,
    vistaLivre: apiListing.data.vistaLivre,
    piscinaTermica: apiListing.data.piscinaTermica,
    andar: apiListing.data.andar,
    link: apiListing.data.link,
    imageUrl: apiListing.data.imageUrl,
    contactName: apiListing.data.contactName,
    contactNumber: apiListing.data.contactNumber,
    starred: apiListing.data.starred,
    visited: apiListing.data.visited,
    strikethrough: apiListing.data.strikethrough,
    discardedReason: apiListing.data.discardedReason,
    customLat: apiListing.data.customLat,
    customLng: apiListing.data.customLng,
    createdAt: apiListing.createdAt,
    addedAt: apiListing.data.addedAt,
  }
}

/**
 * Convert frontend Imovel to API ListingData format
 */
export function toListingData(imovel: Partial<Imovel>): Partial<ListingData> {
  const data: Partial<ListingData> = {}

  if (imovel.titulo !== undefined) data.titulo = imovel.titulo
  if (imovel.endereco !== undefined) data.endereco = imovel.endereco
  if (imovel.m2Totais !== undefined) data.m2Totais = imovel.m2Totais
  if (imovel.m2Privado !== undefined) data.m2Privado = imovel.m2Privado
  if (imovel.quartos !== undefined) data.quartos = imovel.quartos
  if (imovel.suites !== undefined) data.suites = imovel.suites
  if (imovel.banheiros !== undefined) data.banheiros = imovel.banheiros
  if (imovel.garagem !== undefined) data.garagem = imovel.garagem
  if (imovel.preco !== undefined) data.preco = imovel.preco
  if (imovel.precoM2 !== undefined) data.precoM2 = imovel.precoM2
  if (imovel.piscina !== undefined) data.piscina = imovel.piscina
  if (imovel.porteiro24h !== undefined) data.porteiro24h = imovel.porteiro24h
  if (imovel.academia !== undefined) data.academia = imovel.academia
  if (imovel.vistaLivre !== undefined) data.vistaLivre = imovel.vistaLivre
  if (imovel.piscinaTermica !== undefined) data.piscinaTermica = imovel.piscinaTermica
  if (imovel.andar !== undefined) data.andar = imovel.andar
  if (imovel.link !== undefined) data.link = imovel.link
  if (imovel.imageUrl !== undefined) data.imageUrl = imovel.imageUrl
  if (imovel.contactName !== undefined) data.contactName = imovel.contactName
  if (imovel.contactNumber !== undefined) data.contactNumber = imovel.contactNumber
  if (imovel.starred !== undefined) data.starred = imovel.starred
  if (imovel.visited !== undefined) data.visited = imovel.visited
  if (imovel.strikethrough !== undefined) data.strikethrough = imovel.strikethrough
  if (imovel.discardedReason !== undefined) data.discardedReason = imovel.discardedReason
  if (imovel.customLat !== undefined) data.customLat = imovel.customLat
  if (imovel.customLng !== undefined) data.customLng = imovel.customLng
  if (imovel.addedAt !== undefined) data.addedAt = imovel.addedAt

  return data
}

/**
 * Handle API response and throw errors if not successful
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Unknown error" }))
    const error = new Error(data.error || `HTTP error ${response.status}`) as Error & { status: number }
    error.status = response.status
    throw error
  }
  return response.json()
}

// ============================================================================
// COLLECTIONS API
// ============================================================================

/**
 * Fetch all collections for the authenticated user or organization
 */
export async function fetchCollections(orgId?: string): Promise<Collection[]> {
  const url = orgId ? `/api/collections?orgId=${orgId}` : "/api/collections"
  const response = await fetch(url)
  const data = await handleResponse<{ collections: ApiCollection[] }>(response)
  return data.collections.map(toCollection)
}

/**
 * Fetch a single collection by ID
 */
export async function fetchCollection(id: string): Promise<Collection> {
  const response = await fetch(`/api/collections/${id}`)
  const data = await handleResponse<{ collection: ApiCollection }>(response)
  return toCollection(data.collection)
}

/**
 * Create a new collection for user or organization
 */
export async function createCollection(name: string, isDefault?: boolean, orgId?: string): Promise<Collection> {
  const response = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, isDefault, orgId }),
  })
  const data = await handleResponse<{ collection: ApiCollection }>(response)
  return toCollection(data.collection)
}

/**
 * Update a collection
 */
export async function updateCollection(
  id: string,
  updates: { name?: string; isDefault?: boolean; isPublic?: boolean }
): Promise<Collection> {
  const response = await fetch(`/api/collections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  })
  const data = await handleResponse<{ collection: ApiCollection }>(response)
  return toCollection(data.collection)
}

/**
 * Delete a collection
 */
export async function deleteCollection(id: string): Promise<void> {
  const response = await fetch(`/api/collections/${id}`, {
    method: "DELETE",
  })
  await handleResponse<{ success: boolean }>(response)
}

// ============================================================================
// LISTINGS API
// ============================================================================

/**
 * Fetch all listings for a collection
 */
export async function fetchListings(collectionId: string): Promise<Imovel[]> {
  const response = await fetch(`/api/collections/${collectionId}/listings`)
  const data = await handleResponse<{ listings: ApiListing[] }>(response)
  return data.listings.map(toImovel)
}

/**
 * Fetch a single listing by ID
 */
export async function fetchListing(collectionId: string, listingId: string): Promise<Imovel> {
  const response = await fetch(`/api/collections/${collectionId}/listings/${listingId}`)
  const data = await handleResponse<{ listing: ApiListing }>(response)
  return toImovel(data.listing)
}

/**
 * Create a new listing in a collection
 */
export async function createListing(collectionId: string, listingData: ListingData): Promise<Imovel> {
  const response = await fetch(`/api/collections/${collectionId}/listings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: listingData }),
  })
  const data = await handleResponse<{ listing: ApiListing }>(response)
  return toImovel(data.listing)
}

/**
 * Update a listing
 */
export async function updateApiListing(
  collectionId: string,
  listingId: string,
  updates: Partial<Imovel>
): Promise<Imovel> {
  const response = await fetch(`/api/collections/${collectionId}/listings/${listingId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: toListingData(updates) }),
  })
  const data = await handleResponse<{ listing: ApiListing }>(response)
  return toImovel(data.listing)
}

/**
 * Delete a listing
 */
export async function deleteListing(collectionId: string, listingId: string): Promise<void> {
  const response = await fetch(`/api/collections/${collectionId}/listings/${listingId}`, {
    method: "DELETE",
  })
  await handleResponse<{ success: boolean }>(response)
}

// ============================================================================
// AI PARSING API
// ============================================================================

interface ParseApiResponse {
  data?: ListingData
  error?: string
}

/**
 * Parse a listing using the server-side AI parsing API
 */
export async function parseListingWithAI(rawText: string): Promise<ListingData> {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawText }),
  })

  const result: ParseApiResponse = await response.json()

  if (!response.ok) {
    const errorMessage = result.error || "Unknown error"

    if (response.status === 401) {
      throw new Error("Você precisa estar logado para usar o parser de IA.")
    }
    if (response.status === 503) {
      throw new Error("Serviço de IA não está disponível no momento.")
    }
    if (response.status === 429) {
      throw new Error("Limite de requisições excedido. Tente novamente mais tarde.")
    }

    throw new Error(errorMessage)
  }

  if (!result.data) {
    throw new Error("Resposta inválida do servidor")
  }

  return result.data
}

// ============================================================================
// SHARING API
// ============================================================================

export interface ShareInfo {
  isShared: boolean
  shareToken: string | null
  shareUrl: string | null
}

export interface ShareResult {
  collection: ApiCollection
  shareUrl: string
}

/**
 * Get share status for a collection
 */
export async function getShareStatus(collectionId: string): Promise<ShareInfo> {
  const response = await fetch(`/api/collections/${collectionId}/share`)
  return handleResponse<ShareInfo>(response)
}

/**
 * Create a share link for a collection
 */
export async function createShareLink(collectionId: string): Promise<ShareResult> {
  const response = await fetch(`/api/collections/${collectionId}/share`, {
    method: "POST",
  })
  return handleResponse<ShareResult>(response)
}

/**
 * Revoke sharing for a collection
 */
export async function revokeShareLink(collectionId: string): Promise<void> {
  const response = await fetch(`/api/collections/${collectionId}/share`, {
    method: "DELETE",
  })
  await handleResponse<{ success: boolean }>(response)
}

/**
 * Fetch a shared collection by token (public, no auth required)
 */
export async function fetchSharedCollection(token: string): Promise<{
  collection: { id: string; name: string; createdAt: string; updatedAt: string }
  listings: ApiListing[]
  metadata: { totalListings: number }
}> {
  const response = await fetch(`/api/shared/${token}`)
  return handleResponse(response)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if the server-side parsing API is available
 * Since the API key is managed server-side, this always returns true
 */
export function isParsingAvailable(): boolean {
  return true
}
