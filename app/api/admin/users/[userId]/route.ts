import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, users, organizations } from "@/lib/db"
import { eq } from "drizzle-orm"

interface UpdateUserBody {
  isAdmin?: boolean
  name?: string
}

/**
 * PATCH /api/admin/users/[userId]
 * Update a user's profile (admin only)
 * Supports updating: isAdmin, name
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAdmin()
    const { userId } = await params

    const body = await request.json() as UpdateUserBody
    const { isAdmin, name } = body

    // Validate that at least one field is being updated
    if (isAdmin === undefined && name === undefined) {
      return NextResponse.json(
        { error: "At least one field must be provided (isAdmin, name)" },
        { status: 400 }
      )
    }

    // Validate isAdmin if provided
    if (isAdmin !== undefined && typeof isAdmin !== "boolean") {
      return NextResponse.json(
        { error: "isAdmin must be a boolean" },
        { status: 400 }
      )
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string") {
        return NextResponse.json(
          { error: "name must be a string" },
          { status: 400 }
        )
      }
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        )
      }
      if (name.length > 255) {
        return NextResponse.json(
          { error: "name cannot exceed 255 characters" },
          { status: 400 }
        )
      }
    }

    // Prevent admins from removing their own admin status
    if (userId === session.user.id && isAdmin === false) {
      return NextResponse.json(
        { error: "Cannot remove your own admin status" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Build update object
    const updateData: { isAdmin?: boolean; name?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (isAdmin !== undefined) {
      updateData.isAdmin = isAdmin
    }
    if (name !== undefined) {
      updateData.name = name.trim()
    }

    // Update the user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning()

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Delete a user and all their associated data (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAdmin()
    const { userId } = await params

    // Prevent admins from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user - cascade will handle related records (accounts, sessions, subscriptions, collections)
    // but we need to handle organizations owned by the user specially
    
    // First, delete organizations owned by this user (this will cascade to org members and org collections)
    await db
      .delete(organizations)
      .where(eq(organizations.ownerId, userId))

    // Delete the user (cascade handles: accounts, sessions, subscriptions, collections, org memberships)
    await db
      .delete(users)
      .where(eq(users.id, userId))

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
