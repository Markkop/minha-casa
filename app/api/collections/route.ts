import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections, organizationMembers } from "@/lib/db"
import { eq, and, isNull } from "drizzle-orm"

/**
 * GET /api/collections
 * List collections for the authenticated user.
 * Query params:
 * - orgId: If provided, fetch collections for this organization (user must be a member)
 *          If not provided, fetch user's personal collections (where orgId is null)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    const db = getDb()

    if (orgId) {
      // Verify user is a member of the organization
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
        return NextResponse.json(
          { error: "You are not a member of this organization" },
          { status: 403 }
        )
      }

      // Fetch organization collections
      const orgCollections = await db
        .select()
        .from(collections)
        .where(eq(collections.orgId, orgId))
        .orderBy(collections.createdAt)

      return NextResponse.json({ collections: orgCollections })
    }

    // Fetch user's personal collections (where orgId is null)
    const userCollections = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.userId, session.user.id),
          isNull(collections.orgId)
        )
      )
      .orderBy(collections.createdAt)

    return NextResponse.json({ collections: userCollections })
  } catch (error) {
    console.error("Error fetching collections:", error)
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collections
 * Create a new collection for the authenticated user or organization
 * Body params:
 * - name: Collection name (required)
 * - isDefault: Whether this is the default collection
 * - orgId: If provided, create collection for this organization (user must be admin/owner)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, isDefault, orgId } = body as {
      name: string
      isDefault?: boolean
      orgId?: string
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      )
    }

    const db = getDb()

    if (orgId) {
      // Verify user is an admin or owner of the organization
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
        return NextResponse.json(
          { error: "You are not a member of this organization" },
          { status: 403 }
        )
      }

      // Only admins and owners can create collections
      if (membership.role !== "admin" && membership.role !== "owner") {
        return NextResponse.json(
          { error: "Only admins and owners can create collections" },
          { status: 403 }
        )
      }

      // Check if this is the first collection for the org
      const existingOrgCollections = await db
        .select()
        .from(collections)
        .where(eq(collections.orgId, orgId))
        .limit(1)

      const isFirstCollection = existingOrgCollections.length === 0
      const shouldBeDefault = isDefault || isFirstCollection

      // If setting as default, unset other defaults for this org first
      if (shouldBeDefault && !isFirstCollection) {
        await db
          .update(collections)
          .set({ isDefault: false })
          .where(eq(collections.orgId, orgId))
      }

      const [newCollection] = await db
        .insert(collections)
        .values({
          orgId: orgId,
          userId: null,
          name: name.trim(),
          isDefault: shouldBeDefault,
        })
        .returning()

      return NextResponse.json(
        { collection: newCollection },
        { status: 201 }
      )
    }

    // Check if this is the first personal collection for the user
    const existingPersonalCollections = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.userId, session.user.id),
          isNull(collections.orgId)
        )
      )
      .limit(1)

    const isFirstCollection = existingPersonalCollections.length === 0
    const shouldBeDefault = isDefault || isFirstCollection

    // If setting as default, unset other defaults first (for personal collections)
    if (shouldBeDefault && !isFirstCollection) {
      await db
        .update(collections)
        .set({ isDefault: false })
        .where(
          and(
            eq(collections.userId, session.user.id),
            isNull(collections.orgId)
          )
        )
    }

    const [newCollection] = await db
      .insert(collections)
      .values({
        userId: session.user.id,
        orgId: null,
        name: name.trim(),
        isDefault: shouldBeDefault,
      })
      .returning()

    return NextResponse.json(
      { collection: newCollection },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating collection:", error)
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    )
  }
}
