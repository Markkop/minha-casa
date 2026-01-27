import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LoginClient } from "./login-client"

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParams = new URLSearchParams()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}))

// Mock auth-client
const mockSignInEmail = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  signIn: {
    email: (params: { email: string; password: string }) => mockSignInEmail(params),
  },
}))

// Mock global fetch for subscription cookie refresh
const mockFetch = vi.fn()

describe("LoginClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch to resolve successfully for subscription refresh
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    global.fetch = mockFetch
  })

  it("renders login form with email and password fields", () => {
    render(<LoginClient />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument()
  })

  it("renders link to signup page", () => {
    render(<LoginClient />)

    const signupLink = screen.getByRole("link", { name: /criar conta/i })
    expect(signupLink).toBeInTheDocument()
    expect(signupLink).toHaveAttribute("href", "/signup")
  })

  it("shows loading state when form is submitted", async () => {
    mockSignInEmail.mockImplementation(() => new Promise(() => {})) // Never resolves

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /entrando/i })).toBeInTheDocument()
    })
  })

  it("calls signIn.email with correct parameters", async () => {
    mockSignInEmail.mockResolvedValue({ data: { user: {} } })

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      })
    })
  })

  it("redirects to home page on successful login when no redirect param", async () => {
    mockSignInEmail.mockResolvedValue({ data: { user: {} } })
    mockSearchParams.delete("redirect")

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/")
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("redirects to specified URL from redirect param on successful login", async () => {
    mockSignInEmail.mockResolvedValue({ data: { user: {} } })
    mockSearchParams.set("redirect", "/anuncios")

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/anuncios")
      expect(mockRefresh).toHaveBeenCalled()
    })

    // Clean up
    mockSearchParams.delete("redirect")
  })

  it("displays error message when login fails", async () => {
    mockSignInEmail.mockResolvedValue({
      error: { message: "Invalid credentials" },
    })

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "wrongpassword" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials")
    })
  })

  it("displays generic error message when exception is thrown", async () => {
    mockSignInEmail.mockRejectedValue(new Error("Network error"))

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Erro ao fazer login. Tente novamente.")
    })
  })

  it("disables inputs and button while loading", async () => {
    mockSignInEmail.mockImplementation(() => new Promise(() => {}))

    render(<LoginClient />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/senha/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /entrando/i })).toBeDisabled()
    })
  })
})
