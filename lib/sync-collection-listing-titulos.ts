import { eq } from "drizzle-orm"
import { getDb, listings, type ListingData } from "@/lib/db"
import { syncCollectionListingTitulos } from "@/lib/listing-display-title"

/**
 * Regenerate auto titles for all listings in a collection and persist to DB.
 * Listings with tituloManual are left unchanged (titulo = manual value).
 */
export async function persistCollectionListingTitulos(
  collectionId: string
): Promise<void> {
  const db = getDb()
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.collectionId, collectionId))

  if (rows.length === 0) return

  const synced = syncCollectionListingTitulos(
    rows.map((row) => ({
      id: row.id,
      ...row.data,
    }))
  )

  await Promise.all(
    synced.map((listing) => {
      const row = rows.find((r) => r.id === listing.id)!
      const data: ListingData = { ...row.data, titulo: listing.titulo }
      return db
        .update(listings)
        .set({ data })
        .where(eq(listings.id, listing.id))
    })
  )
}
