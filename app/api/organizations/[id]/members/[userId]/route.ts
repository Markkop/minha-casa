import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, organizations, organizationMembers, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import type { OrgMemberRole } from "@/lib/db/schema"

interface RouteParams {
  params: Promise<{ id: string; userId: string }>
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
 * GET /api/organizations/[id]/members/[userId]
 * Get a specific member's details
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

    const { id, userId } = await params
    const db = getDb()

    // Check if organization exists
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

    // Check if requester is a member
    const requesterMembership = await getUserMembership(session.user.id, id)
    if (!requesterMembership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get the member with user details
    const [member] = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, id),
          eq(organizationMembers.userId, userId)
        )
      )

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error("Error fetching organization member:", error)
    return NextResponse.json(
      { error: "Failed to fetch organization member" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organizations/[id]/members/[userId]
 * Update a member's role (owner/admin only)
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

    const { id, userId } = await params
    const body = await request.json()
    const { role } = body as { role?: OrgMemberRole }

    if (!role) {
      return NextResponse.json(
        { error: "Role is required" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles: OrgMemberRole[] = ["owner", "admin", "member"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be owner, admin, or member" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if organization exists
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

    // Check if requester has permission (owner or admin)
    const requesterMembership = await getUserMembership(session.user.id, id)
    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can update member roles" },
        { status: 403 }
      )
    }

    // Get the target member
    const targetMembership = await getUserMembership(userId, id)
    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // Only owner can change roles to/from owner
    if ((role === "owner" || targetMembership.role === "owner") && requesterMembership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can change owner roles" },
        { status: 403 }
      )
    }

    // Admins cannot change other admins' roles
    if (requesterMembership.role === "admin" && targetMembership.role === "admin" && userId !== session.user.id) {
      return NextResponse.json(
        { error: "Admins cannot change other admins' roles" },
        { status: 403 }
      )
    }

    // Prevent demoting the last owner
    if (targetMembership.role === "owner" && role !== "owner") {
      const owners = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, id),
            eq(organizationMembers.role, "owner")
          )
        )

      if (owners.length === 1) {
        return NextResponse.json(
          { error: "Cannot demote the last owner. Transfer ownership first." },
          { status: 400 }
        )
      }
    }

    // Update the member's role
    await db
      .update(organizationMembers)
      .set({ role })
      .where(
        and(
          eq(organizationMembers.orgId, id),
          eq(organizationMembers.userId, userId)
        )
      )

    // Get updated member with user details
    const [updatedMember] = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, id),
          eq(organizationMembers.userId, userId)
        )
      )

    return NextResponse.json({ member: updatedMember })
  } catch (error) {
    console.error("Error updating organization member:", error)
    return NextResponse.json(
      { error: "Failed to update organization member" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/members/[userId]
 * Remove a member from an organization
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

    const { id, userId } = await params
    const db = getDb()

    // Check if organization exists
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

    // Get requester's membership
    const requesterMembership = await getUserMembership(session.user.id, id)
    if (!requesterMembership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get target member
    const targetMembership = await getUserMembership(userId, id)
    if (!targetMembership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    // Users can remove themselves (leave the organization)
    const isLeavingSelf = userId === session.user.id

    if (!isLeavingSelf) {
      // Only owners and admins can remove other members
      if (!["owner", "admin"].includes(requesterMembership.role)) {
        return NextResponse.json(
          { error: "Only owners and admins can remove members" },
          { status: 403 }
        )
      }

      // Only owner can remove admins or other owners
      if (["owner", "admin"].includes(targetMembership.role) && requesterMembership.role !== "owner") {
        return NextResponse.json(
          { error: "Only the owner can remove admins or other owners" },
          { status: 403 }
        )
      }
    }

    // Prevent removing the last owner
    if (targetMembership.role === "owner") {
      const owners = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, id),
            eq(organizationMembers.role, "owner")
          )
        )

      if (owners.length === 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner. Transfer ownership or delete the organization." },
          { status: 400 }
        )
      }
    }

    // Remove the member
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, id),
          eq(organizationMembers.userId, userId)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing organization member:", error)
    return NextResponse.json(
      { error: "Failed to remove organization member" },
      { status: 500 }
    )
  }
}
