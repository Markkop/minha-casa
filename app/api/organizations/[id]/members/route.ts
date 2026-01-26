import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, organizations, organizationMembers, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import type { OrgMemberRole } from "@/lib/db/schema"

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
 * GET /api/organizations/[id]/members
 * List all members of an organization
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

    // Check if user is a member
    const membership = await getUserMembership(session.user.id, id)
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get all members with user details
    const members = await db
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
      .where(eq(organizationMembers.orgId, id))

    return NextResponse.json({ members })
  } catch (error) {
    console.error("Error fetching organization members:", error)
    return NextResponse.json(
      { error: "Failed to fetch organization members" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations/[id]/members
 * Add a member to an organization (owner/admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { email, role = "member" } = body as {
      email: string
      role?: OrgMemberRole
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "User email is required" },
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
        { error: "Only owners and admins can add members" },
        { status: 403 }
      )
    }

    // Only owner can add other owners
    if (role === "owner" && requesterMembership.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can add other owners" },
        { status: 403 }
      )
    }

    // Find the user by email
    const [userToAdd] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))

    if (!userToAdd) {
      return NextResponse.json(
        { error: "User not found with this email" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMembership = await getUserMembership(userToAdd.id, id)
    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      )
    }

    // Add the member
    const [newMember] = await db
      .insert(organizationMembers)
      .values({
        orgId: id,
        userId: userToAdd.id,
        role,
      })
      .returning()

    return NextResponse.json(
      {
        member: {
          ...newMember,
          userName: userToAdd.name,
          userEmail: userToAdd.email,
          userImage: userToAdd.image,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error adding organization member:", error)
    return NextResponse.json(
      { error: "Failed to add organization member" },
      { status: 500 }
    )
  }
}
