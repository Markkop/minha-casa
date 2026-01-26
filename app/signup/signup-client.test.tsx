import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { SignupClient } from "./signup-client"

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock auth-client
const mockSignUpEmail = vi.fn()
vi.mock("@/lib/auth-client", () => ({
  signUp: {
    email: (params: { email: string; password: string; name: string }) => mockSignUpEmail(params),
  },
}))

describe("SignupClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders signup form with all required fields", () => {
    render(<SignupClient />)

    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeInTheDocument()
  })

  it("renders link to login page", () => {
    render(<SignupClient />)

    const loginLink = screen.getByRole("link", { name: /entrar/i })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute("href", "/login")
  })

  it("shows error when passwords do not match", async () => {
    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "differentpassword" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("As senhas nao coincidem.")
    })
    expect(mockSignUpEmail).not.toHaveBeenCalled()
  })

  it("shows error when password is too short", async () => {
    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "short" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "short" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("A senha deve ter pelo menos 8 caracteres.")
    })
    expect(mockSignUpEmail).not.toHaveBeenCalled()
  })

  it("shows loading state when form is submitted", async () => {
    mockSignUpEmail.mockImplementation(() => new Promise(() => {}))

    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /criando conta/i })).toBeInTheDocument()
    })
  })

  it("calls signUp.email with correct parameters", async () => {
    mockSignUpEmail.mockResolvedValue({ data: { user: {} } })

    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
    })
  })

  it("redirects to home page on successful signup", async () => {
    mockSignUpEmail.mockResolvedValue({ data: { user: {} } })

    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/")
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it("displays error message when signup fails", async () => {
    mockSignUpEmail.mockResolvedValue({
      error: { message: "Email already exists" },
    })

    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "existing@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Email already exists")
    })
  })

  it("displays generic error message when exception is thrown", async () => {
    mockSignUpEmail.mockRejectedValue(new Error("Network error"))

    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Erro ao criar conta. Tente novamente.")
    })
  })

  it("disables all inputs and button while loading", async () => {
    mockSignUpEmail.mockImplementation(() => new Promise(() => {}))

    render(<SignupClient />)

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Test User" },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    })
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toBeDisabled()
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/^senha$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirmar senha/i)).toBeDisabled()
      expect(screen.getByRole("button", { name: /criando conta/i })).toBeDisabled()
    })
  })
})
