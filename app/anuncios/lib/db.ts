import { neon } from "@neondatabase/serverless"

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
    preco: number | null
    precoM2: number | null
    piscina: boolean | null
    link: string | null
    imageUrl?: string | null
    starred?: boolean
    visited?: boolean
    strikethrough?: boolean
    discardedReason?: string | null
    customLat?: number | null
    customLng?: number | null
    createdAt: string
    addedAt?: string
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
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return neon(databaseUrl)
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

  const result = await sql`
    INSERT INTO shared_collections (share_token, collection_name, collection_data)
    VALUES (${token}, ${collectionName}, ${JSON.stringify(collectionData)})
    RETURNING id, share_token
  `

  if (!result || result.length === 0) {
    throw new Error("Failed to create share")
  }

  return {
    token: result[0].share_token,
    id: result[0].id,
  }
}

/**
 * Get a shared collection by token
 */
export async function getShare(token: string): Promise<SharedCollection | null> {
  const sql = getDb()

  // Get the share and increment access count
  const result = await sql`
    UPDATE shared_collections
    SET accessed_count = accessed_count + 1
    WHERE share_token = ${token}
    RETURNING id, share_token, collection_name, collection_data, created_at, accessed_count
  `

  if (!result || result.length === 0) {
    return null
  }

  const row = result[0]
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
