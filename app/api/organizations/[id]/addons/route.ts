import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, organizations, organizationMembers } from "@/lib/db"
import { getOrgAddons } from "@/lib/addons"
import { eq, and } from "drizzle-orm"

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * Check if user is a member of the organization
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
 * GET /api/organizations/[id]/addons
 * Get all enabled addons for an organization
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

    // Get organization's enabled addons
    const addons = await getOrgAddons(id)

    return NextResponse.json({ addons })
  } catch (error) {
    console.error("Error fetching organization addons:", error)
    return NextResponse.json(
      { error: "Failed to fetch organization addons" },
      { status: 500 }
    )
  }
}
