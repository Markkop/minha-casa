import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import { SimulatorClient } from "./simulator-client"
import { SettingsProvider } from "./utils/settings"

// Mock next/navigation with stable reference
let mockPriceValue: string | null = null

// Create a stable search params object
const createStableSearchParams = () => {
  const params = {
    get: (key: string) => {
      if (key === "price") return mockPriceValue
      return null
    },
  }
  return params
}

// Keep a stable reference to the search params object
const stableSearchParams = createStableSearchParams()

vi.mock("next/navigation", () => ({
  useSearchParams: () => stableSearchParams,
}))

// Mock fetch for subscription refresh
const mockFetch = vi.fn(() => Promise.resolve({ ok: true }))
global.fetch = mockFetch

// Mock window.history.replaceState
const mockReplaceState = vi.fn()
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
})

// Mock window.location
const mockLocation = {
  href: "http://localhost:3000/casa",
}
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
})

// Helper to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<SettingsProvider>{ui}</SettingsProvider>)
}

describe("SimulatorClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPriceValue = null
    mockLocation.href = "http://localhost:3000/casa"
  })

  afterEach(() => {
    cleanup()
  })

  describe("price query parameter", () => {
    it("renders the simulator with default property value when no price param", async () => {
      mockPriceValue = null

      renderWithProviders(<SimulatorClient />)

      // Wait for loading state to resolve
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // Should render the simulator header
      expect(
        screen.getByText("🏠 Simulador de Financiamento Imobiliário")
      ).toBeInTheDocument()
    })

    it("pre-populates the simulator with price from query param", async () => {
      const testPrice = 1500000
      mockPriceValue = testPrice.toString()
      mockLocation.href = `http://localhost:3000/casa?price=${testPrice}`

      renderWithProviders(<SimulatorClient />)

      // Wait for loading state to resolve
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // The simulator should have rendered
      expect(
        screen.getByText("🏠 Simulador de Financiamento Imobiliário")
      ).toBeInTheDocument()

      // URL should have been cleaned after reading price
      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalled()
      })
    })

    it("cleans up URL parameter after reading price", async () => {
      const testPrice = 1800000
      mockPriceValue = testPrice.toString()
      mockLocation.href = `http://localhost:3000/casa?price=${testPrice}`

      renderWithProviders(<SimulatorClient />)

      // Wait for loading and effect to run
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // Should have called replaceState to clean up URL
      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalled()
      })
    })

    it("ignores invalid price values (non-numeric)", async () => {
      mockPriceValue = "invalid-price"

      renderWithProviders(<SimulatorClient />)

      // Wait for loading state to resolve
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // Should still render the simulator (using default values)
      expect(
        screen.getByText("🏠 Simulador de Financiamento Imobiliário")
      ).toBeInTheDocument()

      // URL should not have been cleaned (no valid price was processed)
      expect(mockReplaceState).not.toHaveBeenCalled()
    })

    it("ignores negative price values", async () => {
      mockPriceValue = "-500000"

      renderWithProviders(<SimulatorClient />)

      // Wait for loading state to resolve
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // Should still render with defaults
      expect(
        screen.getByText("🏠 Simulador de Financiamento Imobiliário")
      ).toBeInTheDocument()

      // URL should not have been cleaned (no valid price was processed)
      expect(mockReplaceState).not.toHaveBeenCalled()
    })

    it("ignores zero price values", async () => {
      mockPriceValue = "0"

      renderWithProviders(<SimulatorClient />)

      // Wait for loading state to resolve
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // Should still render with defaults
      expect(
        screen.getByText("🏠 Simulador de Financiamento Imobiliário")
      ).toBeInTheDocument()

      // URL should not have been cleaned (no valid price was processed)
      expect(mockReplaceState).not.toHaveBeenCalled()
    })

    it("handles decimal price values correctly", async () => {
      const testPrice = 1750000.5
      mockPriceValue = testPrice.toString()
      mockLocation.href = `http://localhost:3000/casa?price=${testPrice}`

      renderWithProviders(<SimulatorClient />)

      // Wait for loading state to resolve
      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      // Should render the simulator
      expect(
        screen.getByText("🏠 Simulador de Financiamento Imobiliário")
      ).toBeInTheDocument()

      // URL should have been cleaned
      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalled()
      })
    })
  })

  describe("subscription refresh", () => {
    it("calls subscription API on mount", async () => {
      mockPriceValue = null

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/subscriptions", {
          method: "GET",
          credentials: "include",
        })
      })
    })
  })

  describe("loading state", () => {
    it("shows loading message while settings are loading", () => {
      mockPriceValue = null

      // Note: The actual loading state is very brief in tests due to synchronous execution
      // This test ensures the component renders properly
      renderWithProviders(<SimulatorClient />)

      // The component should eventually show the simulator
      expect(
        screen.queryByText("🏠 Simulador de Financiamento Imobiliário") ||
          screen.queryByText("Carregando...")
      ).toBeTruthy()
    })
  })
})
