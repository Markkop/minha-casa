import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

// Mock user data
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  isAdmin: false,
}

const mockUser2 = {
  id: "user-456",
  email: "other@example.com",
  name: "Other User",
  isAdmin: false,
}

const mockSession = {
  user: mockUser,
  session: {
    id: "session-123",
    userId: mockUser.id,
    token: "test-token",
    expiresAt: new Date(Date.now() + 86400000),
  },
}

const mockSession2 = {
  user: mockUser2,
  session: {
    id: "session-456",
    userId: mockUser2.id,
    token: "test-token-2",
    expiresAt: new Date(Date.now() + 86400000),
  },
}

// Mock organization data
const mockOrganization = {
  id: "org-123",
  name: "Test Organization",
  slug: "test-organization",
  ownerId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMembership = {
  id: "member-123",
  orgId: mockOrganization.id,
  userId: mockUser.id,
  role: "owner" as const,
  joinedAt: new Date(),
}

const mockMembershipMember = {
  id: "member-456",
  orgId: mockOrganization.id,
  userId: mockUser2.id,
  role: "member" as const,
  joinedAt: new Date(),
}

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock database
const mockDbSelect = vi.fn()
const mockDbInsert = vi.fn()
const mockDbUpdate = vi.fn()
const mockDbDelete = vi.fn()

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    delete: mockDbDelete,
  })),
  organizations: { id: "id", slug: "slug", ownerId: "ownerId" },
  organizationMembers: { orgId: "orgId", userId: "userId", role: "role" },
  users: { id: "id", email: "email" },
  collections: { orgId: "orgId" },
}))

describe("Organizations API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/organizations", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns user organizations when authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                organization: mockOrganization,
                role: "owner",
                joinedAt: new Date(),
              },
            ]),
          }),
        }),
      })

      const { GET } = await import("./route")
      const response = await GET()
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organizations).toHaveLength(1)
      expect(json.organizations[0].name).toBe("Test Organization")
      expect(json.organizations[0].role).toBe("owner")
    })
  })

  describe("POST /api/organizations", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "New Organization" }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when name is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Organization name is required")
    })

    it("returns 400 when slug format is invalid", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Test", slug: "Invalid Slug!" }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Slug must contain only lowercase letters, numbers, and hyphens")
    })

    it("creates organization successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const newOrg = { ...mockOrganization, name: "New Organization", slug: "new-organization" }

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newOrg]),
        }),
      })

      const { POST } = await import("./route")
      const request = new NextRequest("http://localhost/api/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "New Organization" }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.organization.name).toBe("New Organization")
    })
  })
})

describe("Organization Detail API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/organizations/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when organization not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-not-found")

      const response = await GET(request, { params: Promise.resolve({ id: "org-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Organization not found")
    })

    it("returns 403 when user is not a member", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // No membership
          }),
        })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("You are not a member of this organization")
    })

    it("returns organization with member count", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership, mockMembershipMember]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      const { GET } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organization.name).toBe("Test Organization")
      expect(json.organization.memberCount).toBe(2)
    })
  })

  describe("PUT /api/organizations/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Organization" }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when user is not owner or admin", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession2)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembershipMember]), // member role
          }),
        })

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Organization" }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only owners and admins can update organization details")
    })

    it("updates organization successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const updatedOrg = { ...mockOrganization, name: "Updated Organization" }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedOrg]),
          }),
        }),
      })

      const { PUT } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Organization" }),
      })

      const response = await PUT(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.organization.name).toBe("Updated Organization")
    })
  })

  describe("DELETE /api/organizations/[id]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 403 when user is not owner", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession2)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrganization]),
        }),
      })

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only the owner can delete the organization")
    })

    it("deletes organization successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockOrganization]),
        }),
      })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./[id]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })
})

describe("Organization Members API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/organizations/[id]/members", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 404 when organization not found", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { GET } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-not-found/members")

      const response = await GET(request, { params: Promise.resolve({ id: "org-not-found" }) })
      const json = await response.json()

      expect(response.status).toBe(404)
      expect(json.error).toBe("Organization not found")
    })

    it("returns members list successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const mockMemberWithUser = {
        id: mockMembership.id,
        userId: mockUser.id,
        role: mockMembership.role,
        joinedAt: mockMembership.joinedAt,
        userName: mockUser.name,
        userEmail: mockUser.email,
        userImage: mockUser.image,
      }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMemberWithUser]),
            }),
          }),
        })

      const { GET } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members")

      const response = await GET(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.members).toHaveLength(1)
      expect(json.members[0].userName).toBe("Test User")
    })
  })

  describe("POST /api/organizations/[id]/members", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com" }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when email is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members", {
        method: "POST",
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("User email is required")
    })

    it("returns 400 when invalid role provided", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { POST } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", role: "invalid" }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Invalid role. Must be owner, admin, or member")
    })

    it("returns 403 when user is not owner or admin", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession2)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembershipMember]),
          }),
        })

      const { POST } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com" }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(403)
      expect(json.error).toBe("Only owners and admins can add members")
    })

    it("adds member successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const newUser = {
        id: "user-789",
        email: "new@example.com",
        name: "New User",
        image: null,
      }

      const newMember = {
        id: "member-789",
        orgId: mockOrganization.id,
        userId: newUser.id,
        role: "member",
        joinedAt: new Date(),
      }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([newUser]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        })

      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newMember]),
        }),
      })

      const { POST } = await import("./[id]/members/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com" }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: "org-123" }) })
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.member.userName).toBe("New User")
    })
  })
})

describe("Organization Member Detail API", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe("GET /api/organizations/[id]/members/[userId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { GET } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-123")

      const response = await GET(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns member details successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const mockMemberWithUser = {
        id: mockMembership.id,
        userId: mockUser.id,
        role: mockMembership.role,
        joinedAt: mockMembership.joinedAt,
        userName: mockUser.name,
        userEmail: mockUser.email,
        userImage: mockUser.image,
      }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([mockMemberWithUser]),
            }),
          }),
        })

      const { GET } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-123")

      const response = await GET(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.member.userName).toBe("Test User")
      expect(json.member.role).toBe("owner")
    })
  })

  describe("PUT /api/organizations/[id]/members/[userId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PUT } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-456", {
        method: "PUT",
        body: JSON.stringify({ role: "admin" }),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-456" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when role is missing", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const { PUT } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-456", {
        method: "PUT",
        body: JSON.stringify({}),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-456" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Role is required")
    })

    it("updates member role successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      const updatedMember = {
        id: mockMembershipMember.id,
        userId: mockUser2.id,
        role: "admin",
        joinedAt: mockMembershipMember.joinedAt,
        userName: mockUser2.name,
        userEmail: mockUser2.email,
        userImage: null,
      }

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembershipMember]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([updatedMember]),
            }),
          }),
        })

      mockDbUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      const { PUT } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-456", {
        method: "PUT",
        body: JSON.stringify({ role: "admin" }),
      })

      const response = await PUT(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-456" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.member.role).toBe("admin")
    })
  })

  describe("DELETE /api/organizations/[id]/members/[userId]", () => {
    it("returns 401 when not authenticated", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { DELETE } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-456", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-456" }),
      })
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.error).toBe("Unauthorized")
    })

    it("returns 400 when trying to remove last owner", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]), // Only one owner
          }),
        })

      const { DELETE } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-123", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-123" }),
      })
      const json = await response.json()

      expect(response.status).toBe(400)
      expect(json.error).toBe("Cannot remove the last owner. Transfer ownership or delete the organization.")
    })

    it("removes member successfully", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembership]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembershipMember]),
          }),
        })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-456", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-456" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })

    it("allows user to leave organization", async () => {
      const { getServerSession } = await import("@/lib/auth-server")
      vi.mocked(getServerSession).mockResolvedValue(mockSession2)

      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockOrganization]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembershipMember]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockMembershipMember]),
          }),
        })

      mockDbDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      })

      const { DELETE } = await import("./[id]/members/[userId]/route")
      const request = new NextRequest("http://localhost/api/organizations/org-123/members/user-456", {
        method: "DELETE",
      })

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "org-123", userId: "user-456" }),
      })
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
    })
  })
})
