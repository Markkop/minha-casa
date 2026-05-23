/**
 * API Client for Collections and Listings
 *
 * This module provides functions to interact with the server-side APIs
 * for collections and listings management, replacing localStorage operations.
 */

import type { ListingData } from "@/lib/db/schema"
import { resolveListingImages, syncListingImageFields } from "@/lib/listing-images"
import type { ParseRequest } from "./parse-input"
import {
  ApiError,
  ErrorCode,
  parseApiErrorResponse,
  getUserFriendlyMessage,
  type ErrorCodeType,
  type ApiErrorResponse,
} from "@/lib/errors"

// Re-export error utilities for convenience
export { ApiError, ErrorCode, getUserFriendlyMessage }
export type { ErrorCodeType, ApiErrorResponse }

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
  isPublic: boolean
  ownerName?: string
}

export interface Imovel {
  id: string
  titulo: string
  endereco: string
  bairro?: string | null
  cidade?: string | null
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
  imageUrls?: string[] | null
  contactName?: string | null
  contactNumber?: string | null
  condominiumName?: string | null
  condominiumId?: string | null
  regionId?: string | null
  starred?: boolean
  visited?: boolean
  strikethrough?: boolean
  discardedReason?: string | null
  listingStatus?: string | null
  customLat?: number | null
  customLng?: number | null
  createdAt: string
  addedAt?: string
  sitePublishedAt?: string | null
  siteUpdatedAt?: string | null
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert API collection to frontend Collection format
 */
export function toCollection(apiCollection: ApiCollection & { ownerName?: string }): Collection {
  return {
    id: apiCollection.id,
    label: apiCollection.name,
    createdAt: apiCollection.createdAt,
    updatedAt: apiCollection.updatedAt,
    isDefault: apiCollection.isDefault,
    isPublic: apiCollection.isPublic,
    ownerName: apiCollection.ownerName,
  }
}

/**
 * Convert API listing to frontend Imovel format
 */
export function toImovel(apiListing: ApiListing): Imovel {
  const images = resolveListingImages(apiListing.data)
  return {
    id: apiListing.id,
    titulo: apiListing.data.titulo,
    endereco: apiListing.data.endereco,
    bairro: apiListing.data.bairro,
    cidade: apiListing.data.cidade,
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
    tipoImovel: apiListing.data.tipoImovel,
    link: apiListing.data.link,
    imageUrl: images.imageUrl,
    imageUrls: images.imageUrls,
    contactName: apiListing.data.contactName,
    contactNumber: apiListing.data.contactNumber,
    condominiumName: apiListing.data.condominiumName,
    condominiumId: apiListing.data.condominiumId,
    regionId: apiListing.data.regionId,
    starred: apiListing.data.starred,
    visited: apiListing.data.visited,
    strikethrough: apiListing.data.strikethrough,
    discardedReason: apiListing.data.discardedReason,
    listingStatus: apiListing.data.listingStatus,
    customLat: apiListing.data.customLat,
    customLng: apiListing.data.customLng,
    createdAt: apiListing.createdAt,
    addedAt: apiListing.data.addedAt,
    sitePublishedAt: apiListing.data.sitePublishedAt,
    siteUpdatedAt: apiListing.data.siteUpdatedAt,
  }
}

/**
 * Convert frontend Imovel to API ListingData format
 */
export function toListingData(imovel: Partial<Imovel>): Partial<ListingData> {
  const data: Partial<ListingData> = {}

  if (imovel.titulo !== undefined) data.titulo = imovel.titulo
  if (imovel.endereco !== undefined) data.endereco = imovel.endereco
  if (imovel.bairro !== undefined) data.bairro = imovel.bairro
  if (imovel.cidade !== undefined) data.cidade = imovel.cidade
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
  if (imovel.tipoImovel !== undefined) data.tipoImovel = imovel.tipoImovel
  if (imovel.link !== undefined) data.link = imovel.link
  if (imovel.imageUrls !== undefined) {
    const synced = syncListingImageFields(imovel.imageUrls ?? [])
    data.imageUrls = synced.imageUrls
    data.imageUrl = synced.imageUrl
  } else if (imovel.imageUrl !== undefined) {
    data.imageUrl = imovel.imageUrl
    if (imovel.imageUrl) {
      data.imageUrls = [imovel.imageUrl]
    } else {
      data.imageUrls = []
    }
  }
  if (imovel.contactName !== undefined) data.contactName = imovel.contactName
  if (imovel.contactNumber !== undefined) data.contactNumber = imovel.contactNumber
  if (imovel.condominiumName !== undefined) data.condominiumName = imovel.condominiumName
  if (imovel.condominiumId !== undefined) data.condominiumId = imovel.condominiumId
  if (imovel.regionId !== undefined) data.regionId = imovel.regionId
  if (imovel.starred !== undefined) data.starred = imovel.starred
  if (imovel.visited !== undefined) data.visited = imovel.visited
  if (imovel.strikethrough !== undefined) data.strikethrough = imovel.strikethrough
  if (imovel.discardedReason !== undefined) data.discardedReason = imovel.discardedReason
  if (imovel.listingStatus !== undefined) data.listingStatus = imovel.listingStatus
  if (imovel.customLat !== undefined) data.customLat = imovel.customLat
  if (imovel.customLng !== undefined) data.customLng = imovel.customLng
  if (imovel.addedAt !== undefined) data.addedAt = imovel.addedAt
  if (imovel.sitePublishedAt !== undefined) data.sitePublishedAt = imovel.sitePublishedAt
  if (imovel.siteUpdatedAt !== undefined) data.siteUpdatedAt = imovel.siteUpdatedAt

  return data
}

/**
 * Handle API response and throw errors if not successful
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await parseApiErrorResponse(response)
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

/**
 * Copy a collection to another profile (personal or organization)
 */
export async function copyCollection(
  id: string,
  targetOrgId: string | null,
  options?: { includeListings?: boolean; newName?: string }
): Promise<{ collection: Collection; copiedListingsCount: number }> {
  const response = await fetch(`/api/collections/${id}/copy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetOrgId,
      includeListings: options?.includeListings ?? true,
      newName: options?.newName,
    }),
  })
  const data = await handleResponse<{ collection: ApiCollection; copiedListingsCount: number }>(response)
  return {
    collection: toCollection(data.collection),
    copiedListingsCount: data.copiedListingsCount,
  }
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

export interface DuplicateCandidate {
  listingId: string
  score: number
  reason: string
}

/**
 * Check for duplicate listings before create (Phoenix scoring).
 */
export async function checkDuplicateCandidates(
  collectionId: string,
  listingData: ListingData
): Promise<DuplicateCandidate[]> {
  const response = await fetch("/api/listings/check-duplicate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collectionId, data: listingData }),
  })

  if (response.status === 409) {
    const data = await response.json()
    return (data.duplicateCandidates as DuplicateCandidate[]) || []
  }

  if (!response.ok) {
    await handleResponse(response)
  }

  return []
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

export interface PullListingImagesResult {
  imageUrls: string[]
  imageUrl: string | null
  imageCount: number
}

/**
 * Re-scrapes listing link for gallery images (preview; save via updateApiListing).
 */
export async function pullListingImages(listingId: string): Promise<PullListingImagesResult> {
  const response = await fetch(`/api/listings/${listingId}/pull-images`, {
    method: "POST",
  })
  return handleResponse<PullListingImagesResult>(response)
}

// ============================================================================
// AI PARSING API
// ============================================================================

interface ParseApiResponse {
  listings?: ListingData[]
  error?: string
}

const MULTI_LISTING_REPARSE_ERROR =
  "Foram detectados vários imóveis. Use Adicionar imóvel para importar em lote."

const PARSE_SERVER_ERROR_MESSAGE =
  "Erro no servidor ao processar o anúncio. Tente novamente ou cole o texto."

/** Parses /api/parse body; avoids leaking raw JSON SyntaxError on HTML error pages. */
export async function parseParseApiResponseBody(
  response: Response
): Promise<ParseApiResponse> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    const text = await response.text().catch(() => "")
    if (!response.ok) {
      return { error: PARSE_SERVER_ERROR_MESSAGE }
    }
    if (text.trim().startsWith("{")) {
      try {
        return JSON.parse(text) as ParseApiResponse
      } catch {
        return { error: PARSE_SERVER_ERROR_MESSAGE }
      }
    }
    return { error: PARSE_SERVER_ERROR_MESSAGE }
  }

  try {
    return (await response.json()) as ParseApiResponse
  } catch {
    return { error: PARSE_SERVER_ERROR_MESSAGE }
  }
}

async function handleParseApiResponse(
  response: Response,
  result: ParseApiResponse
): Promise<ListingData[]> {
  if (!response.ok) {
    const errorMessage = result.error || "Unknown error"

    if (response.status === 401) {
      throw new ApiError(
        "Você precisa estar logado para usar o parser de IA.",
        401,
        ErrorCode.UNAUTHORIZED
      )
    }
    if (response.status === 503) {
      throw new ApiError(
        "Serviço de IA não está disponível no momento.",
        503,
        ErrorCode.SERVICE_UNAVAILABLE
      )
    }
    if (response.status === 429) {
      throw new ApiError(
        "Limite de requisições excedido. Tente novamente mais tarde.",
        429,
        ErrorCode.RATE_LIMITED
      )
    }

    throw new ApiError(errorMessage, response.status, ErrorCode.UNKNOWN_ERROR)
  }

  if (!result.listings || result.listings.length === 0) {
    throw new ApiError(
      "Resposta inválida do servidor",
      500,
      ErrorCode.INTERNAL_ERROR
    )
  }

  return result.listings
}

/**
 * Parse listing(s) using text, image, or PDF input
 */
export async function parseListing(input: ParseRequest): Promise<ListingData[]> {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  const result = await parseParseApiResponseBody(response)
  return handleParseApiResponse(response, result)
}

/**
 * Parse exactly one listing (for reparse flows)
 */
export async function parseListingSingle(input: ParseRequest): Promise<ListingData> {
  const listings = await parseListing(input)
  if (listings.length !== 1) {
    throw new ApiError(MULTI_LISTING_REPARSE_ERROR, 400, ErrorCode.UNKNOWN_ERROR)
  }
  return listings[0]
}

/**
 * Parse a listing from raw text (for reparse — rejects multi-listing results)
 */
export async function parseListingWithAI(rawText: string): Promise<ListingData> {
  return parseListingSingle({ kind: "text", rawText })
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
// PUBLIC COLLECTIONS API
// ============================================================================

/**
 * Fetch all public collections
 */
export async function fetchPublicCollections(): Promise<Collection[]> {
  const response = await fetch("/api/collections/public")
  const data = await handleResponse<{ collections: (ApiCollection & { ownerName?: string })[] }>(response)
  return data.collections.map(toCollection)
}

/**
 * Fetch listings from a public collection
 */
export async function fetchPublicCollectionListings(collectionId: string): Promise<{
  collection: Collection
  listings: Imovel[]
}> {
  const response = await fetch(`/api/collections/public/${collectionId}`)
  const data = await handleResponse<{
    collection: ApiCollection & { ownerName?: string }
    listings: ApiListing[]
  }>(response)
  return {
    collection: toCollection(data.collection),
    listings: data.listings.map(toImovel),
  }
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
