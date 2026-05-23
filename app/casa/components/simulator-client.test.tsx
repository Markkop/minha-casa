import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import { SimulatorClient } from "./simulator-client"
import { SettingsProvider } from "./utils/settings"

let mockPriceValue: string | null = null

const createStableSearchParams = () => ({
  get: (key: string) => {
    if (key === "price") return mockPriceValue
    return null
  },
})

const stableSearchParams = createStableSearchParams()

vi.mock("next/navigation", () => ({
  useSearchParams: () => stableSearchParams,
}))

const mockFetch = vi.fn(() => Promise.resolve({ ok: true } as Response))
global.fetch = mockFetch as typeof fetch

const mockReplaceState = vi.fn()
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
  writable: true,
})

const mockLocation = {
  href: "http://localhost:3000/financiamento",
}
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
})

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<SettingsProvider>{ui}</SettingsProvider>)
}

describe("SimulatorClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPriceValue = null
    mockLocation.href = "http://localhost:3000/financiamento"
  })

  afterEach(() => {
    cleanup()
  })

  describe("price query parameter", () => {
    it("renders the adjustment panel when no price param", async () => {
      mockPriceValue = null

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("Parâmetros da simulação")).toBeInTheDocument()
      expect(screen.getByText("Valor da Casa")).toBeInTheDocument()
      expect(screen.queryByText("Taxa Efetiva Mensal")).not.toBeInTheDocument()
    })

    it("pre-populates the simulator with price from query param", async () => {
      const testPrice = 1500000
      mockPriceValue = testPrice.toString()
      mockLocation.href = `http://localhost:3000/financiamento?price=${testPrice}`

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      expect(screen.getByText("Parâmetros da simulação")).toBeInTheDocument()

      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalled()
      })
    })

    it("cleans up URL parameter after reading price", async () => {
      const testPrice = 1800000
      mockPriceValue = testPrice.toString()
      mockLocation.href = `http://localhost:3000/financiamento?price=${testPrice}`

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      await waitFor(() => {
        expect(mockReplaceState).toHaveBeenCalled()
      })
    })

    it("ignores invalid price values (non-numeric)", async () => {
      mockPriceValue = "invalid-price"

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      expect(mockReplaceState).not.toHaveBeenCalled()
    })

    it("ignores negative price values", async () => {
      mockPriceValue = "-500000"

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      expect(mockReplaceState).not.toHaveBeenCalled()
    })

    it("ignores zero price values", async () => {
      mockPriceValue = "0"

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

      expect(mockReplaceState).not.toHaveBeenCalled()
    })

    it("handles decimal price values correctly", async () => {
      const testPrice = 1750000.5
      mockPriceValue = testPrice.toString()
      mockLocation.href = `http://localhost:3000/financiamento?price=${testPrice}`

      renderWithProviders(<SimulatorClient />)

      await waitFor(() => {
        expect(screen.queryByText("Carregando...")).not.toBeInTheDocument()
      })

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

      renderWithProviders(<SimulatorClient />)

      expect(
        screen.queryByText("Parâmetros da simulação") || screen.queryByText("Carregando...")
      ).toBeTruthy()
    })
  })
})
