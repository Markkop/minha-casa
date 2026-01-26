import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { NavBar } from "./nav-bar"

// Mock next/navigation
const mockPathname = vi.fn()
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}))

// Mock auth-client
const mockUseSession = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  useSession: () => mockUseSession(),
}))

// Mock OrganizationSwitcher
vi.mock("@/components/organization-switcher", () => ({
  OrganizationSwitcher: () => (
    <div data-testid="organization-switcher">Organization Switcher</div>
  ),
}))

describe("NavBar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue("/")
    mockUseSession.mockReturnValue({ data: null })
  })

  afterEach(() => {
    cleanup()
  })

  describe("rendering", () => {
    it("renders the logo with link to home", () => {
      render(<NavBar />)

      const logoLink = screen.getByRole("link", { name: /minha casa/i })
      expect(logoLink).toBeInTheDocument()
      expect(logoLink).toHaveAttribute("href", "/")
    })

    it("renders all navigation links", () => {
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /inicio/i })).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /simulador/i })
      ).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /anuncios/i })).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /organizacoes/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /risco enchente/i })
      ).toBeInTheDocument()
    })

    it("has correct hrefs for navigation links", () => {
      render(<NavBar />)

      expect(screen.getByRole("link", { name: /inicio/i })).toHaveAttribute(
        "href",
        "/"
      )
      expect(screen.getByRole("link", { name: /simulador/i })).toHaveAttribute(
        "href",
        "/casa"
      )
      expect(screen.getByRole("link", { name: /anuncios/i })).toHaveAttribute(
        "href",
        "/anuncios"
      )
      expect(
        screen.getByRole("link", { name: /organizacoes/i })
      ).toHaveAttribute("href", "/organizacoes")
      expect(
        screen.getByRole("link", { name: /risco enchente/i })
      ).toHaveAttribute("href", "/floodrisk")
    })
  })

  describe("active link highlighting", () => {
    it("highlights home link when on home page", () => {
      mockPathname.mockReturnValue("/")
      render(<NavBar />)

      const homeLink = screen.getByRole("link", { name: /inicio/i })
      expect(homeLink).toHaveClass("bg-primary/10", "text-primary")
    })

    it("highlights anuncios link when on anuncios page", () => {
      mockPathname.mockReturnValue("/anuncios")
      render(<NavBar />)

      const anunciosLink = screen.getByRole("link", { name: /anuncios/i })
      expect(anunciosLink).toHaveClass("bg-primary/10", "text-primary")
    })

    it("highlights casa link when on casa page", () => {
      mockPathname.mockReturnValue("/casa")
      render(<NavBar />)

      const casaLink = screen.getByRole("link", { name: /simulador/i })
      expect(casaLink).toHaveClass("bg-primary/10", "text-primary")
    })

    it("does not highlight inactive links", () => {
      mockPathname.mockReturnValue("/")
      render(<NavBar />)

      const anunciosLink = screen.getByRole("link", { name: /anuncios/i })
      expect(anunciosLink).not.toHaveClass("bg-primary/10")
      expect(anunciosLink).toHaveClass("text-ashGray")
    })
  })

  describe("organization switcher", () => {
    it("does not show organization switcher when user is not logged in", () => {
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      expect(
        screen.queryByTestId("organization-switcher")
      ).not.toBeInTheDocument()
    })

    it("shows organization switcher when user is logged in", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.getByTestId("organization-switcher")).toBeInTheDocument()
    })
  })

  describe("admin link", () => {
    it("does not show admin link for non-admin users", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "user-1", name: "Test User", isAdmin: false } },
      })
      render(<NavBar />)

      expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument()
    })

    it("does not show admin link when user is not logged in", () => {
      mockUseSession.mockReturnValue({ data: null })
      render(<NavBar />)

      expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument()
    })

    it("shows admin link for admin users", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "admin-1", name: "Admin User", isAdmin: true } },
      })
      render(<NavBar />)

      const adminLink = screen.getByRole("link", { name: /admin/i })
      expect(adminLink).toBeInTheDocument()
      expect(adminLink).toHaveAttribute("href", "/admin")
    })

    it("highlights admin link when on admin page", () => {
      mockPathname.mockReturnValue("/admin")
      mockUseSession.mockReturnValue({
        data: { user: { id: "admin-1", name: "Admin User", isAdmin: true } },
      })
      render(<NavBar />)

      const adminLink = screen.getByRole("link", { name: /admin/i })
      expect(adminLink).toHaveClass("bg-primary/10", "text-primary")
    })
  })

  describe("navigation icons", () => {
    it("renders navigation icons for each link", () => {
      render(<NavBar />)

      // Check for emoji icons
      expect(screen.getByText("🏡")).toBeInTheDocument()
      expect(screen.getByText("📊")).toBeInTheDocument()
      expect(screen.getByText("🏘️")).toBeInTheDocument()
      expect(screen.getByText("👥")).toBeInTheDocument()
      expect(screen.getByText("🌊")).toBeInTheDocument()
    })

    it("renders admin icon for admin users", () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "admin-1", name: "Admin User", isAdmin: true } },
      })
      render(<NavBar />)

      expect(screen.getByText("⚙️")).toBeInTheDocument()
    })
  })
})
