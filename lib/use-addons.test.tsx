import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { type ReactNode } from "react"
import {
  AddonsProvider,
  useAddons,
  useHasAddon,
  useAddonsLoading,
} from "./use-addons"
import type { UserAddon, OrganizationAddon } from "./addons"

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Sample test data
const mockUserAddons: UserAddon[] = [
  {
    id: "ua-1",
    userId: "user-1",
    addonSlug: "financiamento",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: null,
  },
  {
    id: "ua-2",
    userId: "user-1",
    addonSlug: "disabled-addon",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: false,
    expiresAt: null,
  },
]

const mockOrgAddons: OrganizationAddon[] = [
  {
    id: "oa-1",
    organizationId: "org-1",
    addonSlug: "flood",
    grantedAt: new Date("2024-01-01"),
    grantedBy: "admin-1",
    enabled: true,
    expiresAt: null,
  },
]

// Wrapper component for hooks that need the provider
function createWrapper(options?: {
  initialUserAddons?: UserAddon[]
  initialOrgAddons?: OrganizationAddon[]
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AddonsProvider
        initialUserAddons={options?.initialUserAddons}
        initialOrgAddons={options?.initialOrgAddons}
      >
        {children}
      </AddonsProvider>
    )
  }
}

describe("useAddons", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null) // Default to personal context
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("useAddons hook", () => {
    it("throws error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAddons())
      }).toThrow("useAddons must be used within an AddonsProvider")

      consoleSpy.mockRestore()
    })

    it("returns initial addons without loading", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
          initialOrgAddons: mockOrgAddons,
        }),
      })

      expect(result.current.userAddons).toEqual(mockUserAddons)
      expect(result.current.orgAddons).toEqual(mockOrgAddons)
      expect(result.current.isLoading).toBe(false)
    })

    it("starts loading when no initial addons provided", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [] }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
    })

    it("fetches user addons from API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: mockUserAddons }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith("/api/user/addons")
      expect(result.current.userAddons).toEqual(mockUserAddons)
    })

    it("fetches org addons when in organization context", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockUserAddons }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith("/api/user/addons")
      expect(mockFetch).toHaveBeenCalledWith("/api/organizations/org-1/addons")
      expect(result.current.userAddons).toEqual(mockUserAddons)
      expect(result.current.orgAddons).toEqual(mockOrgAddons)
    })

    it("handles 401 response gracefully for user addons", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.userAddons).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it("handles 403 response gracefully for org addons", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockUserAddons }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.userAddons).toEqual(mockUserAddons)
      expect(result.current.orgAddons).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it("sets error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe(
        "Failed to fetch user addons: Internal Server Error"
      )
    })

    it("refresh reloads addons from API", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ addons: mockUserAddons }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({ initialUserAddons: [] }),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: mockUserAddons }),
      })

      await act(async () => {
        await result.current.refresh()
      })

      expect(mockFetch).toHaveBeenCalledWith("/api/user/addons")
    })
  })

  describe("hasAddon", () => {
    it("returns true when user has enabled addon", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current.hasAddon("financiamento")).toBe(true)
    })

    it("returns false when user has disabled addon", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current.hasAddon("disabled-addon")).toBe(false)
    })

    it("returns true when org has enabled addon", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialOrgAddons: mockOrgAddons,
        }),
      })

      expect(result.current.hasAddon("flood")).toBe(true)
    })

    it("returns true when user OR org has addon", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
          initialOrgAddons: mockOrgAddons,
        }),
      })

      // User has financiamento
      expect(result.current.hasAddon("financiamento")).toBe(true)
      // Org has flood
      expect(result.current.hasAddon("flood")).toBe(true)
    })

    it("returns false when neither user nor org has addon", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
          initialOrgAddons: mockOrgAddons,
        }),
      })

      expect(result.current.hasAddon("nonexistent")).toBe(false)
    })
  })

  describe("useHasAddon hook", () => {
    it("returns true when addon is available", () => {
      const { result } = renderHook(() => useHasAddon("financiamento"), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current).toBe(true)
    })

    it("returns false when addon is not available", () => {
      const { result } = renderHook(() => useHasAddon("nonexistent"), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current).toBe(false)
    })

    it("checks both user and org addons", () => {
      const { result: userResult } = renderHook(
        () => useHasAddon("financiamento"),
        {
          wrapper: createWrapper({
            initialUserAddons: mockUserAddons,
            initialOrgAddons: mockOrgAddons,
          }),
        }
      )

      const { result: orgResult } = renderHook(() => useHasAddon("flood"), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
          initialOrgAddons: mockOrgAddons,
        }),
      })

      expect(userResult.current).toBe(true)
      expect(orgResult.current).toBe(true)
    })
  })

  describe("useAddonsLoading hook", () => {
    it("returns loading state", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [] }),
      })

      const { result } = renderHook(() => useAddonsLoading(), {
        wrapper: createWrapper(),
      })

      expect(result.current).toBe(true)
    })

    it("returns false when not loading", () => {
      const { result } = renderHook(() => useAddonsLoading(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current).toBe(false)
    })
  })

  describe("AddonsProvider", () => {
    it("provides default empty arrays when no initial addons", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ addons: [] }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.userAddons).toEqual([])
      expect(result.current.orgAddons).toEqual([])
    })

    it("provides org context information", () => {
      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current.orgContext).toEqual({ type: "personal" })
    })
  })

  describe("revokeUserAddon", () => {
    it("successfully revokes a user addon", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.revokeUserAddon("financiamento")
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith("/api/user/addons/financiamento", {
        method: "DELETE",
      })
      // Addon should be removed from local state
      expect(result.current.userAddons.find(a => a.addonSlug === "financiamento")).toBeUndefined()
    })

    it("returns false when revoke fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to revoke" }),
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.revokeUserAddon("financiamento")
      })

      expect(success).toBe(false)
      // Addon should still be in local state
      expect(result.current.userAddons.find(a => a.addonSlug === "financiamento")).toBeDefined()

      consoleSpy.mockRestore()
    })

    it("sets isRevoking during operation", async () => {
      let resolvePromise: () => void
      const fetchPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockImplementationOnce(async () => {
        await fetchPromise
        return {
          ok: true,
          json: async () => ({ success: true }),
        }
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current.isRevoking).toBe(false)

      let revokePromise: Promise<boolean>
      act(() => {
        revokePromise = result.current.revokeUserAddon("financiamento")
      })

      await waitFor(() => {
        expect(result.current.isRevoking).toBe(true)
      })

      await act(async () => {
        resolvePromise!()
        await revokePromise
      })

      expect(result.current.isRevoking).toBe(false)
    })
  })

  describe("revokeOrgAddon", () => {
    it("returns false when not in organization context", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialOrgAddons: mockOrgAddons,
        }),
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.revokeOrgAddon("flood")
      })

      expect(success).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it("successfully revokes an org addon when in organization context", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockUserAddons }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.revokeOrgAddon("flood")
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/organizations/org-1/addons/flood",
        { method: "DELETE" }
      )
      // Addon should be removed from local state
      expect(result.current.orgAddons.find(a => a.addonSlug === "flood")).toBeUndefined()
    })

    it("returns false when org revoke fails", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Forbidden" }),
        })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.revokeOrgAddon("flood")
      })

      expect(success).toBe(false)
      // Addon should still be in local state
      expect(result.current.orgAddons.find(a => a.addonSlug === "flood")).toBeDefined()

      consoleSpy.mockRestore()
    })
  })

  describe("toggleUserAddon", () => {
    it("successfully toggles a user addon to disabled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, addon: { ...mockUserAddons[0], enabled: false } }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.toggleUserAddon("financiamento", false)
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith("/api/user/addons/financiamento", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      })
      // Addon should be updated in local state
      const updatedAddon = result.current.userAddons.find(a => a.addonSlug === "financiamento")
      expect(updatedAddon?.enabled).toBe(false)
    })

    it("successfully toggles a user addon to enabled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, addon: { ...mockUserAddons[1], enabled: true } }),
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.toggleUserAddon("disabled-addon", true)
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith("/api/user/addons/disabled-addon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      })
      // Addon should be updated in local state
      const updatedAddon = result.current.userAddons.find(a => a.addonSlug === "disabled-addon")
      expect(updatedAddon?.enabled).toBe(true)
    })

    it("returns false when toggle fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to toggle" }),
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.toggleUserAddon("financiamento", false)
      })

      expect(success).toBe(false)
      // Addon should still have original state
      const addon = result.current.userAddons.find(a => a.addonSlug === "financiamento")
      expect(addon?.enabled).toBe(true)

      consoleSpy.mockRestore()
    })

    it("sets isToggling during operation", async () => {
      let resolvePromise: () => void
      const fetchPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockImplementationOnce(async () => {
        await fetchPromise
        return {
          ok: true,
          json: async () => ({ success: true, addon: { ...mockUserAddons[0], enabled: false } }),
        }
      })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialUserAddons: mockUserAddons,
        }),
      })

      expect(result.current.isToggling).toBe(false)

      let togglePromise: Promise<boolean>
      act(() => {
        togglePromise = result.current.toggleUserAddon("financiamento", false)
      })

      await waitFor(() => {
        expect(result.current.isToggling).toBe(true)
      })

      await act(async () => {
        resolvePromise!()
        await togglePromise
      })

      expect(result.current.isToggling).toBe(false)
    })
  })

  describe("toggleOrgAddon", () => {
    it("returns false when not in organization context", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper({
          initialOrgAddons: mockOrgAddons,
        }),
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.toggleOrgAddon("flood", false)
      })

      expect(success).toBe(false)
      expect(mockFetch).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it("successfully toggles an org addon when in organization context", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockUserAddons }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, addon: { ...mockOrgAddons[0], enabled: false } }),
        })

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean = false
      await act(async () => {
        success = await result.current.toggleOrgAddon("flood", false)
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/organizations/org-1/addons/flood",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: false }),
        }
      )
      // Addon should be updated in local state
      const updatedAddon = result.current.orgAddons.find(a => a.addonSlug === "flood")
      expect(updatedAddon?.enabled).toBe(false)
    })

    it("returns false when org toggle fails", async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          type: "organization",
          organizationId: "org-1",
          organizationName: "Test Org",
        })
      )

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ addons: mockOrgAddons }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: "Forbidden" }),
        })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      const { result } = renderHook(() => useAddons(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let success: boolean = true
      await act(async () => {
        success = await result.current.toggleOrgAddon("flood", false)
      })

      expect(success).toBe(false)
      // Addon should still have original state
      const addon = result.current.orgAddons.find(a => a.addonSlug === "flood")
      expect(addon?.enabled).toBe(true)

      consoleSpy.mockRestore()
    })
  })
})
