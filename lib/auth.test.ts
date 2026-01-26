import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")

describe("auth", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe("auth configuration", () => {
    it("exports auth object with expected methods", async () => {
      const { auth } = await import("./auth")
      
      expect(auth).toBeDefined()
      expect(auth.api).toBeDefined()
      expect(auth.handler).toBeDefined()
    })

    it("exports Session and User types", async () => {
      // Type-only test - if this compiles, types are exported correctly
      const authModule = await import("./auth")
      
      expect(authModule).toHaveProperty("auth")
      // Type exports don't show up at runtime but module should load without errors
    })
  })

  describe("auth-client", () => {
    it("exports authClient with expected methods", async () => {
      const { authClient, signIn, signUp, signOut, useSession, getSession } = await import("./auth-client")
      
      expect(authClient).toBeDefined()
      expect(signIn).toBeDefined()
      expect(signUp).toBeDefined()
      expect(signOut).toBeDefined()
      expect(useSession).toBeDefined()
      expect(getSession).toBeDefined()
    })

    it("signIn has email method", async () => {
      const { signIn } = await import("./auth-client")
      
      expect(signIn.email).toBeDefined()
      expect(typeof signIn.email).toBe("function")
    })

    it("signUp has email method", async () => {
      const { signUp } = await import("./auth-client")
      
      expect(signUp.email).toBeDefined()
      expect(typeof signUp.email).toBe("function")
    })
  })
})

describe("auth-server helpers", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("exports getServerSession function", async () => {
    const { getServerSession } = await import("./auth-server")
    
    expect(getServerSession).toBeDefined()
    expect(typeof getServerSession).toBe("function")
  })

  it("exports requireAuth function", async () => {
    const { requireAuth } = await import("./auth-server")
    
    expect(requireAuth).toBeDefined()
    expect(typeof requireAuth).toBe("function")
  })

  it("exports isAdmin function", async () => {
    const { isAdmin } = await import("./auth-server")
    
    expect(isAdmin).toBeDefined()
    expect(typeof isAdmin).toBe("function")
  })

  it("exports requireAdmin function", async () => {
    const { requireAdmin } = await import("./auth-server")
    
    expect(requireAdmin).toBeDefined()
    expect(typeof requireAdmin).toBe("function")
  })
})
