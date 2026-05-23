import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"
import { ClickablePrice } from "./clickable-price"

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe("ClickablePrice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe("price display", () => {
    it("formats price correctly in BRL currency", () => {
      render(<ClickablePrice price={500000} />)
      expect(screen.getByText("R$ 500.000")).toBeInTheDocument()
    })

    it("shows em dash when price is null", () => {
      render(<ClickablePrice price={null} />)
      expect(screen.getByText("—")).toBeInTheDocument()
    })

    it("formats large prices correctly", () => {
      render(<ClickablePrice price={1500000} />)
      expect(screen.getByText("R$ 1.500.000")).toBeInTheDocument()
    })

    it("formats small prices correctly", () => {
      render(<ClickablePrice price={50000} />)
      expect(screen.getByText("R$ 50.000")).toBeInTheDocument()
    })
  })

  describe("clickable price", () => {
    it("shows price as clickable element when price is set", () => {
      render(<ClickablePrice price={500000} />)

      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toBeInTheDocument()
      expect(priceElement).toHaveAttribute("role", "button")
    })

    it("has cursor-pointer styling", () => {
      render(<ClickablePrice price={500000} />)
      expect(screen.getByTestId("clickable-price")).toHaveClass("cursor-pointer")
    })

    it("navigates to financing page on click", () => {
      render(<ClickablePrice price={500000} />)
      fireEvent.click(screen.getByTestId("clickable-price"))
      expect(mockPush).toHaveBeenCalledWith("/financiamento?price=500000")
    })

    it("navigates with correct price value", () => {
      render(<ClickablePrice price={1250000} />)
      fireEvent.click(screen.getByTestId("clickable-price"))
      expect(mockPush).toHaveBeenCalledWith("/financiamento?price=1250000")
    })

    it("does not navigate when price is null", () => {
      render(<ClickablePrice price={null} />)
      expect(screen.getByTestId("price-display")).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it("supports keyboard navigation with Enter key", () => {
      render(<ClickablePrice price={500000} />)
      fireEvent.keyDown(screen.getByTestId("clickable-price"), { key: "Enter" })
      expect(mockPush).toHaveBeenCalledWith("/financiamento?price=500000")
    })

    it("supports keyboard navigation with Space key", () => {
      render(<ClickablePrice price={500000} />)
      fireEvent.keyDown(screen.getByTestId("clickable-price"), { key: " " })
      expect(mockPush).toHaveBeenCalledWith("/financiamento?price=500000")
    })

    it("has tabIndex for keyboard accessibility", () => {
      render(<ClickablePrice price={500000} />)
      expect(screen.getByTestId("clickable-price")).toHaveAttribute("tabIndex", "0")
    })

    it("has primary color styling", () => {
      render(<ClickablePrice price={500000} />)
      expect(screen.getByTestId("clickable-price")).toHaveClass("text-app-accent")
    })
  })

  describe("strikethrough styling", () => {
    it("applies strikethrough when strikethrough is true", () => {
      render(<ClickablePrice price={500000} strikethrough={true} />)
      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).toHaveClass("line-through")
      expect(priceElement).toHaveClass("opacity-50")
    })

    it("applies strikethrough when price is null", () => {
      render(<ClickablePrice price={null} strikethrough={true} />)
      const priceElement = screen.getByTestId("price-display")
      expect(priceElement).toHaveClass("line-through")
      expect(priceElement).toHaveClass("opacity-50")
    })

    it("does not apply strikethrough when false", () => {
      render(<ClickablePrice price={500000} strikethrough={false} />)
      const priceElement = screen.getByTestId("clickable-price")
      expect(priceElement).not.toHaveClass("line-through")
    })
  })

  describe("custom className", () => {
    it("applies custom className when price is set", () => {
      render(<ClickablePrice price={500000} className="custom-class" />)
      expect(screen.getByTestId("clickable-price")).toHaveClass("custom-class")
    })

    it("applies custom className when price is null", () => {
      render(<ClickablePrice price={null} className="custom-class" />)
      expect(screen.getByTestId("price-display")).toHaveClass("custom-class")
    })
  })
})
