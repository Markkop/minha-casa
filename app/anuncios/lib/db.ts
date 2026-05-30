import { getPgPool } from "@/lib/db/pool"

// Types for shared collections
export interface SharedCollection {
  id: string
  share_token: string
  collection_name: string
  collection_data: CollectionExportData
  created_at: string
  accessed_count: number
}

export interface CollectionExportData {
  collection: {
    id: string
    label: string
    createdAt: string
    updatedAt: string
    isDefault: boolean
  }
  listings: Array<{
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
    link: string | null
    imageUrl?: string | null
    imageUrls?: string[] | null
    imageStorageKeys?: string[] | null
    imageCoverIndex?: number | null
    imageCategories?: Record<string, string> | null
    imageIngestionStatus?: string | null
    imageIngestionError?: string | null
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
    sitePublishedAt?: string | null
    siteUpdatedAt?: string | null
  }>
}

/**
 * Generate a unique share token (12 characters, alphanumeric)
 */
export function generateShareToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Get database connection
 */
function getDb() {
  return getPgPool()
}

/**
 * Create a new shared collection in the database
 */
export async function createShare(
  collectionName: string,
  collectionData: CollectionExportData
): Promise<{ token: string; id: string }> {
  const sql = getDb()
  const token = generateShareToken()

  const result = await sql.query(
    `INSERT INTO shared_collections (share_token, collection_name, collection_data)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, share_token`,
    [token, collectionName, JSON.stringify(collectionData)]
  )

  if (!result.rows || result.rows.length === 0) {
    throw new Error("Failed to create share")
  }

  return {
    token: result.rows[0].share_token,
    id: result.rows[0].id,
  }
}

/**
 * Get a shared collection by token
 */
export async function getShare(token: string): Promise<SharedCollection | null> {
  const sql = getDb()

  // Get the share and increment access count
  const result = await sql.query(
    `UPDATE shared_collections
     SET accessed_count = accessed_count + 1
     WHERE share_token = $1
     RETURNING id, share_token, collection_name, collection_data, created_at, accessed_count`,
    [token]
  )

  if (!result.rows || result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    share_token: row.share_token,
    collection_name: row.collection_name,
    collection_data: row.collection_data as CollectionExportData,
    created_at: row.created_at,
    accessed_count: row.accessed_count,
  }
}

/**
 * Validate master password for creating shares
 */
export function validateMasterPassword(password: string): boolean {
  const masterPassword = process.env.SHARE_MASTER_PASSWORD
  if (!masterPassword) {
    console.error("SHARE_MASTER_PASSWORD environment variable is not set")
    return false
  }
  return password === masterPassword
}
