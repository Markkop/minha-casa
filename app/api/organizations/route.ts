import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, organizations, organizationMembers } from "@/lib/db"
import { eq } from "drizzle-orm"

/**
 * GET /api/organizations
 * List all organizations the user is a member of
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = getDb()

    // Get all organizations where the user is a member
    const memberships = await db
      .select({
        organization: organizations,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.orgId, organizations.id))
      .where(eq(organizationMembers.userId, session.user.id))

    const userOrganizations = memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.joinedAt,
    }))

    return NextResponse.json({ organizations: userOrganizations })
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    )
  }
}

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Trim hyphens from start/end
    .substring(0, 50) // Limit length
}

/**
 * POST /api/organizations
 * Create a new organization
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
    const { name, slug: providedSlug } = body as {
      name: string
      slug?: string
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    let slug = providedSlug?.trim() || generateSlug(trimmedName)

    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if slug is already taken
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug))

    if (existingOrg) {
      // Append a random suffix to make it unique
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`
    }

    // Create the organization
    const [newOrganization] = await db
      .insert(organizations)
      .values({
        name: trimmedName,
        slug,
        ownerId: session.user.id,
      })
      .returning()

    // Add the creator as an owner member
    await db.insert(organizationMembers).values({
      orgId: newOrganization.id,
      userId: session.user.id,
      role: "owner",
    })

    return NextResponse.json(
      { organization: newOrganization },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating organization:", error)
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    )
  }
}
