import { getDb, collections, organizationMembers, type Collection } from "@/lib/db"
import { eq, and } from "drizzle-orm"

/**
 * Verifies if a user has access to a collection.
 * A user has access if:
 * 1. They are the owner of the collection (personal)
 * 2. The collection belongs to an organization they are a member of
 */
export async function verifyCollectionAccess(
  collectionId: string,
  userId: string
): Promise<{ collection: Collection; isOrgCollection: boolean; memberRole?: string } | null> {
  const db = getDb()

  // First, get the collection to see who it belongs to
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))

  if (!collection) return null

  // If it's a personal collection, check if user is the owner
  if (collection.userId === userId) {
    return { collection, isOrgCollection: false }
  }

  // If it's an organization collection, check if user is a member
  if (collection.orgId) {
    const [membership] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, collection.orgId),
          eq(organizationMembers.userId, userId)
        )
      )

    if (membership) {
      return { 
        collection, 
        isOrgCollection: true, 
        memberRole: membership.role 
      }
    }
  }

  return null
}
