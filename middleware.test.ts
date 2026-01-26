import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock NextResponse
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server")
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({ type: "next" })),
      redirect: vi.fn((url: URL) => ({ type: "redirect", url: url.toString() })),
    },
  }
})

import { middleware } from "./middleware"
import { NextResponse } from "next/server"

function createMockRequest(
  pathname: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const url = new URL(pathname, "http://localhost:3000")
  const request = new NextRequest(url)

  // Mock cookies
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value)
  }

  return request
}

describe("auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("public routes", () => {
    it("allows access to home page without authentication", () => {
      const request = createMockRequest("/")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to login page without authentication", () => {
      const request = createMockRequest("/login")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to signup page without authentication", () => {
      const request = createMockRequest("/signup")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to auth API routes without authentication", () => {
      const request = createMockRequest("/api/auth/signin")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to _next routes without authentication", () => {
      const request = createMockRequest("/_next/static/chunk.js")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to favicon without authentication", () => {
      const request = createMockRequest("/favicon.ico")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe("protected routes without authentication", () => {
    it("redirects to login for /anuncios without session", () => {
      const request = createMockRequest("/anuncios")
      middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.toString()).toContain("/login")
      expect(redirectCall.toString()).toContain("redirect=%2Fanuncios")
    })

    it("redirects to login for /casa without session", () => {
      const request = createMockRequest("/casa")
      middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.toString()).toContain("/login")
      expect(redirectCall.toString()).toContain("redirect=%2Fcasa")
    })

    it("redirects to login for /planos without session", () => {
      const request = createMockRequest("/planos")
      middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.toString()).toContain("/login")
      expect(redirectCall.toString()).toContain("redirect=%2Fplanos")
    })

    it("redirects to login for /floodrisk without session", () => {
      const request = createMockRequest("/floodrisk")
      middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.toString()).toContain("/login")
    })

    it("includes the original path in redirect parameter", () => {
      const request = createMockRequest("/some/deep/path")
      middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0]
      expect(redirectCall.toString()).toContain(
        "redirect=%2Fsome%2Fdeep%2Fpath"
      )
    })
  })

  describe("protected routes with authentication", () => {
    it("allows access to /anuncios with valid session token", () => {
      const request = createMockRequest("/anuncios", {
        "better-auth.session_token": "valid-session-token",
      })
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to /casa with valid session token", () => {
      const request = createMockRequest("/casa", {
        "better-auth.session_token": "valid-session-token",
      })
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access with secure session token cookie", () => {
      const request = createMockRequest("/anuncios", {
        "__Secure-better-auth.session_token": "valid-session-token",
      })
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("allows access to nested protected routes with session", () => {
      const request = createMockRequest("/anuncios/some/nested/path", {
        "better-auth.session_token": "valid-session-token",
      })
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  describe("API routes", () => {
    it("allows access to /api/auth routes without authentication", () => {
      const request = createMockRequest("/api/auth/session")
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })

    it("redirects other API routes without authentication", () => {
      const request = createMockRequest("/api/share")
      middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
    })

    it("allows other API routes with authentication", () => {
      const request = createMockRequest("/api/share", {
        "better-auth.session_token": "valid-session-token",
      })
      middleware(request)

      expect(NextResponse.next).toHaveBeenCalled()
      expect(NextResponse.redirect).not.toHaveBeenCalled()
    })
  })
})
