import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { ClickablePrice } from "./clickable-price"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock useAddons hook
const mockHasAddon = vi.fn()
vi.mock("@/lib/use-addons", () => ({
  useAddons: () => ({
    hasAddon: mockHasAddon,
  }),
}))

describe("ClickablePrice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasAddon.mockReturnValue(false)
  })

  afterEach(() => {
    cleanup()
  })

  // ===========================================================================
  // Display Tests
  // ===========================================================================

  describe("price display", () => {
    it("formats price correctly in BRL currency", () => {
      mockHasAddon.mockReturnValue(false)

      render(<ClickablePrice price={500000} />)

      expect(screen.getByText("R$ 500.000")).toBeInTheDocument()
    })

    it("shows em dash when price is null", () => {
      mockHasAddon.mockReturnValue(false)

      render(<ClickablePrice price={null} />)

      expect(screen.getByText("—")).toBeInTheDocument()
    })

    it("formats large prices correctly", () => {
      mockHasAddon.mockReturnValue(false)

      render(<ClickablePrice price={1500000} />)

      expect(screen.getByText("R$ 1.500.000")).toBeInTheDocument()
    })

    it("formats small prices correctly", () => {
      mockHasAddon.mockReturnValue(false)

      render(<ClickablePrice price={50000} />)

      expect(screen.getByText("R$ 50.000")).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Addon Disabled State Tests
  // ===========================================================================

  describe("when financiamento addon is disabled", () => {
    beforeEach(() => {
      mockHasAddon.mockReturnValue(false)
    })

    it("shows price as non-clickable text", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("price-display")
      expect(priceElement).toBeInTheDocument()
      expect(priceElement.tagName).toBe("SPAN")
    })

    it("does not have cursor-pointer class", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("price-display")
      expect(priceElement).not.toHaveClass("cursor-pointer")
    })

    it("does not navigate on click", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("price-display")
      fireEvent.click(priceElement)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it("does not show tooltip", () => {
      render(<ClickablePrice price={500000} />)

      // Non-clickable price should not have tooltip trigger
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("calls hasAddon with 'financiamento' slug", () => {
      render(<ClickablePrice price={500000} />)

      expect(mockHasAddon).toHaveBeenCalledWith("financiamento")
    })
  })

  // ===========================================================================
  // Addon Enabled State Tests
  // ===========================================================================

  describe("when financiamento addon is enabled", () => {
    beforeEach(() => {
      mockHasAddon.mockReturnValue(true)
    })

    it("shows price as clickable element", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toBeInTheDocument()
      expect(priceElement).toHaveAttribute("role", "button")
    })

    it("has cursor-pointer styling", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toHaveClass("cursor-pointer")
    })

    it("navigates to financing page on click", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      fireEvent.click(priceElement)

      expect(mockPush).toHaveBeenCalledWith("/casa?valorImovel=500000")
    })

    it("navigates with correct price value", () => {
      render(<ClickablePrice price={1250000} />)

      const priceElement = screen.getByTestId("clickable-price")
      fireEvent.click(priceElement)

      expect(mockPush).toHaveBeenCalledWith("/casa?valorImovel=1250000")
    })

    it("does not navigate when price is null", () => {
      render(<ClickablePrice price={null} />)

      const priceElement = screen.getByTestId("clickable-price")
      fireEvent.click(priceElement)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it("supports keyboard navigation with Enter key", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      fireEvent.keyDown(priceElement, { key: "Enter" })

      expect(mockPush).toHaveBeenCalledWith("/casa?valorImovel=500000")
    })

    it("supports keyboard navigation with Space key", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      fireEvent.keyDown(priceElement, { key: " " })

      expect(mockPush).toHaveBeenCalledWith("/casa?valorImovel=500000")
    })

    it("has tabIndex for keyboard accessibility", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toHaveAttribute("tabIndex", "0")
    })

    it("has primary color styling", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toHaveClass("text-primary")
    })
  })

  // ===========================================================================
  // Strikethrough Tests
  // ===========================================================================

  describe("strikethrough styling", () => {
    it("applies strikethrough styling when strikethrough is true (addon disabled)", () => {
      mockHasAddon.mockReturnValue(false)

      render(<ClickablePrice price={500000} strikethrough={true} />)

      const priceElement = screen.getByTestId("price-display")
      expect(priceElement).toHaveClass("line-through")
      expect(priceElement).toHaveClass("opacity-50")
    })

    it("applies strikethrough styling when strikethrough is true (addon enabled)", () => {
      mockHasAddon.mockReturnValue(true)

      render(<ClickablePrice price={500000} strikethrough={true} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toHaveClass("line-through")
      expect(priceElement).toHaveClass("opacity-50")
    })

    it("does not apply strikethrough when false", () => {
      mockHasAddon.mockReturnValue(true)

      render(<ClickablePrice price={500000} strikethrough={false} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).not.toHaveClass("line-through")
      expect(priceElement).not.toHaveClass("opacity-50")
    })

    it("does not apply strikethrough when undefined", () => {
      mockHasAddon.mockReturnValue(true)

      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).not.toHaveClass("line-through")
    })
  })

  // ===========================================================================
  // Custom className Tests
  // ===========================================================================

  describe("custom className", () => {
    it("applies custom className when addon is disabled", () => {
      mockHasAddon.mockReturnValue(false)

      render(<ClickablePrice price={500000} className="custom-class" />)

      const priceElement = screen.getByTestId("price-display")
      expect(priceElement).toHaveClass("custom-class")
    })

    it("applies custom className when addon is enabled", () => {
      mockHasAddon.mockReturnValue(true)

      render(<ClickablePrice price={500000} className="custom-class" />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toHaveClass("custom-class")
    })
  })
})
