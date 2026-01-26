import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, organizations, organizationMembers, collections } from "@/lib/db"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Check if user is a member of the organization and get their role
 */
async function getUserMembership(userId: string, orgId: string) {
  const db = getDb()
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId)
      )
    )
  return membership
}

/**
 * GET /api/organizations/[id]
 * Get organization details with member count
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const db = getDb()

    // Get the organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user is a member
    const membership = await getUserMembership(session.user.id, id)
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get member count
    const members = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.orgId, id))

    // Get collections count
    const orgCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.orgId, id))

    return NextResponse.json({
      organization: {
        ...organization,
        memberCount: members.length,
        collectionsCount: orgCollections.length,
        userRole: membership.role,
      },
    })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organizations/[id]
 * Update organization details (owner/admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name } = body as { name?: string }

    const db = getDb()

    // Get the organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user has permission (owner or admin)
    const membership = await getUserMembership(session.user.id, id)
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can update organization details" },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: Partial<typeof organizations.$inferInsert> = {}

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Organization name cannot be empty" },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    updateData.updatedAt = new Date()

    const [updatedOrganization] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning()

    return NextResponse.json({ organization: updatedOrganization })
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete an organization (owner only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const db = getDb()

    // Get the organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Only the owner can delete the organization
    if (organization.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can delete the organization" },
        { status: 403 }
      )
    }

    // Delete the organization (members and collections will be cascade deleted)
    await db.delete(organizations).where(eq(organizations.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting organization:", error)
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    )
  }
}
