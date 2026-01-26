import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, collections } from "@/lib/db"
import { eq } from "drizzle-orm"

/**
 * GET /api/collections
 * List all collections for the authenticated user
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
    const userCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, session.user.id))
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
 * Create a new collection for the authenticated user
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
    const { name, isDefault } = body as {
      name: string
      isDefault?: boolean
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Collection name is required" },
        { status: 400 }
      )
    }

    const db = getDb()

    // If setting as default, unset other defaults first
    if (isDefault) {
      await db
        .update(collections)
        .set({ isDefault: false })
        .where(eq(collections.userId, session.user.id))
    }

    const [newCollection] = await db
      .insert(collections)
      .values({
        userId: session.user.id,
        name: name.trim(),
        isDefault: isDefault ?? false,
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
