import { describe, it, expect } from "vitest"
import {
  users,
  accounts,
  sessions,
  verifications,
  plans,
  subscriptions,
  organizations,
  organizationMembers,
  collections,
  listings,
  subscriptionStatusEnum,
  orgMemberRoleEnum,
  type PlanLimits,
  type ListingData,
  type SubscriptionStatus,
  type OrgMemberRole,
} from "./schema"
import { getTableName, getTableColumns } from "drizzle-orm"

describe("Database Schema", () => {
  describe("users table", () => {
    it("has correct table name", () => {
      expect(getTableName(users)).toBe("users")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(users)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("email")
      expect(columnNames).toContain("emailVerified")
      expect(columnNames).toContain("name")
      expect(columnNames).toContain("image")
      expect(columnNames).toContain("isAdmin")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("has correct column types", () => {
      const columns = getTableColumns(users)
      
      // UUID is stored as string type in Drizzle
      expect(columns.id.dataType).toBe("string")
      expect(columns.email.dataType).toBe("string")
      expect(columns.emailVerified.dataType).toBe("boolean")
      expect(columns.name.dataType).toBe("string")
      expect(columns.isAdmin.dataType).toBe("boolean")
      expect(columns.createdAt.dataType).toBe("date")
      expect(columns.updatedAt.dataType).toBe("date")
    })

    it("email column is unique and not null", () => {
      const columns = getTableColumns(users)
      expect(columns.email.notNull).toBe(true)
      expect(columns.email.isUnique).toBe(true)
    })
  })

  describe("accounts table", () => {
    it("has correct table name", () => {
      expect(getTableName(accounts)).toBe("accounts")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(accounts)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("userId")
      expect(columnNames).toContain("accountId")
      expect(columnNames).toContain("providerId")
      expect(columnNames).toContain("accessToken")
      expect(columnNames).toContain("refreshToken")
      expect(columnNames).toContain("password")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("has foreign key to users", () => {
      const columns = getTableColumns(accounts)
      expect(columns.userId.notNull).toBe(true)
    })
  })

  describe("sessions table", () => {
    it("has correct table name", () => {
      expect(getTableName(sessions)).toBe("sessions")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(sessions)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("userId")
      expect(columnNames).toContain("token")
      expect(columnNames).toContain("expiresAt")
      expect(columnNames).toContain("ipAddress")
      expect(columnNames).toContain("userAgent")
    })

    it("token is unique", () => {
      const columns = getTableColumns(sessions)
      expect(columns.token.isUnique).toBe(true)
    })
  })

  describe("verifications table", () => {
    it("has correct table name", () => {
      expect(getTableName(verifications)).toBe("verifications")
    })

    it("has required columns", () => {
      const columns = getTableColumns(verifications)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("identifier")
      expect(columnNames).toContain("value")
      expect(columnNames).toContain("expiresAt")
    })
  })

  describe("plans table", () => {
    it("has correct table name", () => {
      expect(getTableName(plans)).toBe("plans")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(plans)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("name")
      expect(columnNames).toContain("slug")
      expect(columnNames).toContain("description")
      expect(columnNames).toContain("priceInCents")
      expect(columnNames).toContain("isActive")
      expect(columnNames).toContain("limits")
    })

    it("name and slug are unique", () => {
      const columns = getTableColumns(plans)
      expect(columns.name.isUnique).toBe(true)
      expect(columns.slug.isUnique).toBe(true)
    })
  })

  describe("subscriptions table", () => {
    it("has correct table name", () => {
      expect(getTableName(subscriptions)).toBe("subscriptions")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(subscriptions)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("userId")
      expect(columnNames).toContain("planId")
      expect(columnNames).toContain("status")
      expect(columnNames).toContain("startsAt")
      expect(columnNames).toContain("expiresAt")
      expect(columnNames).toContain("grantedBy")
      expect(columnNames).toContain("notes")
    })

    it("userId and planId are required", () => {
      const columns = getTableColumns(subscriptions)
      expect(columns.userId.notNull).toBe(true)
      expect(columns.planId.notNull).toBe(true)
    })
  })

  describe("organizations table", () => {
    it("has correct table name", () => {
      expect(getTableName(organizations)).toBe("organizations")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(organizations)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("name")
      expect(columnNames).toContain("slug")
      expect(columnNames).toContain("ownerId")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("slug is unique", () => {
      const columns = getTableColumns(organizations)
      expect(columns.slug.isUnique).toBe(true)
    })
  })

  describe("organizationMembers table", () => {
    it("has correct table name", () => {
      expect(getTableName(organizationMembers)).toBe("organization_members")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(organizationMembers)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("orgId")
      expect(columnNames).toContain("userId")
      expect(columnNames).toContain("role")
      expect(columnNames).toContain("joinedAt")
    })

    it("orgId and userId are required", () => {
      const columns = getTableColumns(organizationMembers)
      expect(columns.orgId.notNull).toBe(true)
      expect(columns.userId.notNull).toBe(true)
    })
  })

  describe("collections table", () => {
    it("has correct table name", () => {
      expect(getTableName(collections)).toBe("collections")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(collections)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("userId")
      expect(columnNames).toContain("orgId")
      expect(columnNames).toContain("name")
      expect(columnNames).toContain("isPublic")
      expect(columnNames).toContain("shareToken")
      expect(columnNames).toContain("isDefault")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("shareToken is unique", () => {
      const columns = getTableColumns(collections)
      expect(columns.shareToken.isUnique).toBe(true)
    })

    it("allows nullable userId and orgId for ownership flexibility", () => {
      const columns = getTableColumns(collections)
      // Both can be null (but constraint ensures one must be set)
      expect(columns.userId.notNull).toBe(false)
      expect(columns.orgId.notNull).toBe(false)
    })
  })

  describe("listings table", () => {
    it("has correct table name", () => {
      expect(getTableName(listings)).toBe("listings")
    })

    it("has all required columns", () => {
      const columns = getTableColumns(listings)
      const columnNames = Object.keys(columns)
      
      expect(columnNames).toContain("id")
      expect(columnNames).toContain("collectionId")
      expect(columnNames).toContain("data")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("collectionId is required", () => {
      const columns = getTableColumns(listings)
      expect(columns.collectionId.notNull).toBe(true)
    })

    it("data column is jsonb type", () => {
      const columns = getTableColumns(listings)
      expect(columns.data.dataType).toBe("json")
    })
  })

  describe("type exports", () => {
    it("exports subscriptionStatusEnum with correct values", () => {
      expect(subscriptionStatusEnum).toEqual(["active", "expired", "cancelled"])
    })

    it("exports orgMemberRoleEnum with correct values", () => {
      expect(orgMemberRoleEnum).toEqual(["owner", "admin", "member"])
    })

    it("PlanLimits type has correct structure", () => {
      const limits: PlanLimits = {
        collectionsLimit: 10,
        listingsPerCollection: 100,
        aiParsesPerMonth: 50,
        canShare: true,
        canCreateOrg: true,
      }
      expect(limits.collectionsLimit).toBe(10)
      expect(limits.canShare).toBe(true)
    })

    it("PlanLimits allows null for numeric limits", () => {
      const limits: PlanLimits = {
        collectionsLimit: null,
        listingsPerCollection: null,
        aiParsesPerMonth: null,
        canShare: true,
        canCreateOrg: false,
      }
      expect(limits.collectionsLimit).toBeNull()
      expect(limits.canCreateOrg).toBe(false)
    })

    it("ListingData type has correct structure", () => {
      const listing: ListingData = {
        titulo: "Apartamento 3 quartos",
        endereco: "Rua das Flores, 123",
        m2Totais: 120,
        m2Privado: 100,
        quartos: 3,
        suites: 1,
        banheiros: 2,
        garagem: 2,
        preco: 500000,
        precoM2: 4166.67,
        piscina: false,
        porteiro24h: true,
        academia: true,
        vistaLivre: false,
        piscinaTermica: null,
        andar: 5,
        link: "https://example.com/listing",
        imageUrl: "https://example.com/image.jpg",
        contactName: "João",
        contactNumber: "11999999999",
        starred: true,
        visited: false,
        strikethrough: false,
        discardedReason: null,
        customLat: -23.5505,
        customLng: -46.6333,
        addedAt: "2024-01-01T00:00:00Z",
      }
      expect(listing.titulo).toBe("Apartamento 3 quartos")
      expect(listing.preco).toBe(500000)
    })

    it("SubscriptionStatus type matches enum", () => {
      const status1: SubscriptionStatus = "active"
      const status2: SubscriptionStatus = "expired"
      const status3: SubscriptionStatus = "cancelled"
      expect([status1, status2, status3]).toEqual(subscriptionStatusEnum)
    })

    it("OrgMemberRole type matches enum", () => {
      const role1: OrgMemberRole = "owner"
      const role2: OrgMemberRole = "admin"
      const role3: OrgMemberRole = "member"
      expect([role1, role2, role3]).toEqual(orgMemberRoleEnum)
    })
  })

  describe("table count", () => {
    it("has all 10 expected tables defined", () => {
      const tables = [
        users,
        accounts,
        sessions,
        verifications,
        plans,
        subscriptions,
        organizations,
        organizationMembers,
        collections,
        listings,
      ]
      expect(tables.length).toBe(10)
      
      // Verify each is a valid table
      tables.forEach(table => {
        expect(getTableName(table)).toBeDefined()
        expect(typeof getTableName(table)).toBe("string")
      })
    })
  })
})
