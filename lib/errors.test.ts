import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"
import {
  ErrorCode,
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ServiceUnavailableError,
  InternalError,
  ApiError,
  isAppError,
  toAppError,
  handleApiError,
  successResponse,
  requireAuth,
  requireField,
  requireString,
  requireResource,
  parseApiErrorResponse,
  getUserFriendlyMessage,
} from "./errors"

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create an error with all properties", () => {
      const error = new AppError({
        message: "Test error",
        code: ErrorCode.INTERNAL_ERROR,
        statusCode: 500,
        details: { field: "test" },
      })

      expect(error.message).toBe("Test error")
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR)
      expect(error.statusCode).toBe(500)
      expect(error.details).toEqual({ field: "test" })
      expect(error.timestamp).toBeDefined()
      expect(error.name).toBe("AppError")
    })

    it("should store the cause error", () => {
      const cause = new Error("Original error")
      const error = new AppError({
        message: "Wrapped error",
        code: ErrorCode.INTERNAL_ERROR,
        statusCode: 500,
        cause,
      })

      expect(error.cause).toBe(cause)
    })

    it("should convert to JSON format", () => {
      const error = new AppError({
        message: "Test error",
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
        details: { field: "email" },
      })

      const json = error.toJSON()

      expect(json.error).toBe("Test error")
      expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(json.details).toEqual({ field: "email" })
      expect(json.timestamp).toBeDefined()
    })

    it("should convert to NextResponse", async () => {
      const error = new AppError({
        message: "Test error",
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
      })

      const response = error.toResponse()

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(404)

      const body = await response.json()
      expect(body.error).toBe("Test error")
      expect(body.code).toBe(ErrorCode.NOT_FOUND)
    })
  })

  describe("UnauthorizedError", () => {
    it("should create with default message", () => {
      const error = new UnauthorizedError()

      expect(error.message).toBe("Authentication required")
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED)
      expect(error.statusCode).toBe(401)
      expect(error.name).toBe("UnauthorizedError")
    })

    it("should create with custom message", () => {
      const error = new UnauthorizedError("Custom auth message")

      expect(error.message).toBe("Custom auth message")
    })
  })

  describe("ForbiddenError", () => {
    it("should create with default message", () => {
      const error = new ForbiddenError()

      expect(error.message).toBe("Access denied")
      expect(error.code).toBe(ErrorCode.FORBIDDEN)
      expect(error.statusCode).toBe(403)
      expect(error.name).toBe("ForbiddenError")
    })

    it("should create with details", () => {
      const error = new ForbiddenError("No permission", { requiredRole: "admin" })

      expect(error.details).toEqual({ requiredRole: "admin" })
    })
  })

  describe("NotFoundError", () => {
    it("should create with resource name", () => {
      const error = new NotFoundError("Collection")

      expect(error.message).toBe("Collection not found")
      expect(error.code).toBe(ErrorCode.NOT_FOUND)
      expect(error.statusCode).toBe(404)
      expect(error.name).toBe("NotFoundError")
    })

    it("should use default resource name", () => {
      const error = new NotFoundError()

      expect(error.message).toBe("Resource not found")
    })
  })

  describe("ValidationError", () => {
    it("should create with message and details", () => {
      const error = new ValidationError("Invalid email format", {
        field: "email",
        value: "invalid",
      })

      expect(error.message).toBe("Invalid email format")
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.statusCode).toBe(400)
      expect(error.details).toEqual({ field: "email", value: "invalid" })
      expect(error.name).toBe("ValidationError")
    })
  })

  describe("ConflictError", () => {
    it("should create conflict error", () => {
      const error = new ConflictError("Resource already exists")

      expect(error.message).toBe("Resource already exists")
      expect(error.code).toBe(ErrorCode.CONFLICT)
      expect(error.statusCode).toBe(409)
      expect(error.name).toBe("ConflictError")
    })
  })

  describe("RateLimitError", () => {
    it("should create with default message", () => {
      const error = new RateLimitError()

      expect(error.message).toBe("Too many requests. Please try again later.")
      expect(error.code).toBe(ErrorCode.RATE_LIMITED)
      expect(error.statusCode).toBe(429)
      expect(error.name).toBe("RateLimitError")
    })
  })

  describe("ServiceUnavailableError", () => {
    it("should create with service name", () => {
      const error = new ServiceUnavailableError("OpenAI")

      expect(error.message).toBe("OpenAI is temporarily unavailable")
      expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE)
      expect(error.statusCode).toBe(503)
      expect(error.name).toBe("ServiceUnavailableError")
    })
  })

  describe("InternalError", () => {
    it("should create with default message", () => {
      const error = new InternalError()

      expect(error.message).toBe("An unexpected error occurred")
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR)
      expect(error.statusCode).toBe(500)
      expect(error.name).toBe("InternalError")
    })

    it("should preserve cause", () => {
      const cause = new Error("DB connection failed")
      const error = new InternalError("Database error", cause)

      expect(error.cause).toBe(cause)
    })
  })
})

describe("Error Utilities", () => {
  describe("isAppError", () => {
    it("should return true for AppError instances", () => {
      expect(isAppError(new AppError({
        message: "test",
        code: ErrorCode.INTERNAL_ERROR,
        statusCode: 500,
      }))).toBe(true)
      expect(isAppError(new UnauthorizedError())).toBe(true)
      expect(isAppError(new NotFoundError())).toBe(true)
    })

    it("should return false for non-AppError instances", () => {
      expect(isAppError(new Error("test"))).toBe(false)
      expect(isAppError("string error")).toBe(false)
      expect(isAppError(null)).toBe(false)
      expect(isAppError(undefined)).toBe(false)
    })
  })

  describe("toAppError", () => {
    it("should return AppError as-is", () => {
      const original = new ValidationError("test")
      const result = toAppError(original)

      expect(result).toBe(original)
    })

    it("should convert Error to InternalError", () => {
      const original = new Error("Something went wrong")
      const result = toAppError(original)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.message).toBe("Something went wrong")
      expect(result.cause).toBe(original)
    })

    it("should convert unknown values to InternalError", () => {
      const result = toAppError("string error")

      expect(result).toBeInstanceOf(InternalError)
      expect(result.message).toBe("An unknown error occurred")
    })
  })

  describe("handleApiError", () => {
    beforeEach(() => {
      vi.spyOn(console, "error").mockImplementation(() => {})
    })

    it("should handle AppError and return response", async () => {
      const error = new NotFoundError("Listing")
      const response = handleApiError(error, "test")

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe("Listing not found")
      expect(body.code).toBe(ErrorCode.NOT_FOUND)
    })

    it("should convert regular Error to InternalError response", async () => {
      const error = new Error("DB error")
      const response = handleApiError(error)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe("DB error")
      expect(body.code).toBe(ErrorCode.INTERNAL_ERROR)
    })

    it("should log errors with context", () => {
      const error = new ValidationError("Bad input")
      handleApiError(error, "TestEndpoint")

      expect(console.error).toHaveBeenCalledWith(
        "[TestEndpoint] ValidationError: Bad input",
        expect.objectContaining({
          code: ErrorCode.VALIDATION_ERROR,
          statusCode: 400,
        })
      )
    })
  })

  describe("successResponse", () => {
    it("should create success response with data", async () => {
      const data = { id: "123", name: "Test" }
      const response = successResponse(data)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual(data)
    })

    it("should support custom status code", async () => {
      const data = { created: true }
      const response = successResponse(data, 201)

      expect(response.status).toBe(201)
    })
  })
})

describe("Validation Helpers", () => {
  describe("requireAuth", () => {
    it("should pass with valid session", () => {
      const session = { user: { id: "user-123" } }

      expect(() => requireAuth(session)).not.toThrow()
    })

    it("should throw UnauthorizedError for null session", () => {
      expect(() => requireAuth(null)).toThrow(UnauthorizedError)
    })

    it("should throw UnauthorizedError for session without user", () => {
      const session = { user: null } as unknown as { user: { id: string } }

      expect(() => requireAuth(session)).toThrow(UnauthorizedError)
    })
  })

  describe("requireField", () => {
    it("should pass with defined value", () => {
      expect(() => requireField("value", "name")).not.toThrow()
      expect(() => requireField(0, "count")).not.toThrow()
      expect(() => requireField(false, "flag")).not.toThrow()
    })

    it("should throw ValidationError for undefined", () => {
      expect(() => requireField(undefined, "name")).toThrow(ValidationError)
    })

    it("should throw ValidationError for null", () => {
      expect(() => requireField(null, "name")).toThrow(ValidationError)
    })

    it("should include field name in error details", () => {
      try {
        requireField(undefined, "email")
      } catch (error) {
        expect((error as ValidationError).details).toEqual({ field: "email" })
      }
    })
  })

  describe("requireString", () => {
    it("should pass with non-empty string", () => {
      expect(() => requireString("value", "name")).not.toThrow()
    })

    it("should throw for empty string", () => {
      expect(() => requireString("", "name")).toThrow(ValidationError)
    })

    it("should throw for whitespace-only string", () => {
      expect(() => requireString("   ", "name")).toThrow(ValidationError)
    })

    it("should throw for non-string values", () => {
      expect(() => requireString(123, "name")).toThrow(ValidationError)
      expect(() => requireString(null, "name")).toThrow(ValidationError)
    })
  })

  describe("requireResource", () => {
    it("should pass with defined resource", () => {
      const resource = { id: "123" }
      expect(() => requireResource(resource, "Listing")).not.toThrow()
    })

    it("should throw NotFoundError for undefined", () => {
      expect(() => requireResource(undefined, "Listing")).toThrow(NotFoundError)
    })

    it("should throw NotFoundError for null", () => {
      expect(() => requireResource(null, "Collection")).toThrow(NotFoundError)
    })

    it("should include resource name in message", () => {
      try {
        requireResource(null, "Collection")
      } catch (error) {
        expect((error as NotFoundError).message).toBe("Collection not found")
      }
    })
  })
})

describe("Client-Side Error Utilities", () => {
  describe("ApiError", () => {
    it("should create with all properties", () => {
      const error = new ApiError("Test error", 400, ErrorCode.VALIDATION_ERROR, {
        field: "email",
      })

      expect(error.message).toBe("Test error")
      expect(error.status).toBe(400)
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.details).toEqual({ field: "email" })
      expect(error.name).toBe("ApiError")
    })

    it("should check error code", () => {
      const error = new ApiError("Not found", 404, ErrorCode.NOT_FOUND)

      expect(error.is(ErrorCode.NOT_FOUND)).toBe(true)
      expect(error.is(ErrorCode.UNAUTHORIZED)).toBe(false)
    })

    it("should identify auth errors", () => {
      const unauthorized = new ApiError("Auth", 401, ErrorCode.UNAUTHORIZED)
      const expired = new ApiError("Expired", 401, ErrorCode.SESSION_EXPIRED)
      const notFound = new ApiError("Not found", 404, ErrorCode.NOT_FOUND)

      expect(unauthorized.isAuthError()).toBe(true)
      expect(expired.isAuthError()).toBe(true)
      expect(notFound.isAuthError()).toBe(false)
    })

    it("should identify validation errors", () => {
      const validation = new ApiError("Invalid", 400, ErrorCode.VALIDATION_ERROR)
      const input = new ApiError("Bad input", 400, ErrorCode.INVALID_INPUT)
      const notFound = new ApiError("Not found", 404, ErrorCode.NOT_FOUND)

      expect(validation.isValidationError()).toBe(true)
      expect(input.isValidationError()).toBe(true)
      expect(notFound.isValidationError()).toBe(false)
    })

    it("should identify not found errors", () => {
      const notFound = new ApiError("Not found", 404, ErrorCode.NOT_FOUND)
      const validation = new ApiError("Invalid", 400, ErrorCode.VALIDATION_ERROR)

      expect(notFound.isNotFoundError()).toBe(true)
      expect(validation.isNotFoundError()).toBe(false)
    })

    it("should identify retryable errors", () => {
      const rateLimit = new ApiError("Rate limit", 429, ErrorCode.RATE_LIMITED)
      const unavailable = new ApiError("Down", 503, ErrorCode.SERVICE_UNAVAILABLE)
      const internal = new ApiError("Error", 500, ErrorCode.INTERNAL_ERROR)
      const notFound = new ApiError("Not found", 404, ErrorCode.NOT_FOUND)

      expect(rateLimit.isRetryable()).toBe(true)
      expect(unavailable.isRetryable()).toBe(true)
      expect(internal.isRetryable()).toBe(true)
      expect(notFound.isRetryable()).toBe(false)
    })
  })

  describe("parseApiErrorResponse", () => {
    it("should parse error response with all fields", async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          error: "Validation failed",
          code: ErrorCode.VALIDATION_ERROR,
          details: { field: "email" },
        }),
        status: 400,
      } as unknown as Response

      const error = await parseApiErrorResponse(mockResponse)

      expect(error.message).toBe("Validation failed")
      expect(error.status).toBe(400)
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
      expect(error.details).toEqual({ field: "email" })
    })

    it("should handle missing fields", async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({}),
        status: 500,
      } as unknown as Response

      const error = await parseApiErrorResponse(mockResponse)

      expect(error.message).toBe("HTTP error 500")
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
    })

    it("should handle JSON parse failure", async () => {
      const mockResponse = {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
        status: 503,
      } as unknown as Response

      const error = await parseApiErrorResponse(mockResponse)

      expect(error.message).toBe("HTTP error 503")
      expect(error.status).toBe(503)
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR)
    })
  })

  describe("getUserFriendlyMessage", () => {
    it("should return Portuguese message by default", () => {
      const error = new ApiError("Auth required", 401, ErrorCode.UNAUTHORIZED)
      const message = getUserFriendlyMessage(error)

      expect(message).toBe("Por favor, faça login para continuar")
    })

    it("should return English message when requested", () => {
      const error = new ApiError("Auth required", 401, ErrorCode.UNAUTHORIZED)
      const message = getUserFriendlyMessage(error, "en")

      expect(message).toBe("Please sign in to continue")
    })

    it("should preserve original message for validation errors", () => {
      const error = new ApiError("Email inválido", 400, ErrorCode.VALIDATION_ERROR)
      const message = getUserFriendlyMessage(error, "pt")

      expect(message).toBe("Email inválido")
    })

    it("should return friendly message for rate limit errors", () => {
      const error = new ApiError("Rate limited", 429, ErrorCode.RATE_LIMITED)

      expect(getUserFriendlyMessage(error, "pt")).toBe(
        "Muitas requisições. Por favor, aguarde um momento e tente novamente"
      )
      expect(getUserFriendlyMessage(error, "en")).toBe(
        "Too many requests. Please wait a moment and try again"
      )
    })

    it("should return friendly message for service unavailable", () => {
      const error = new ApiError("Down", 503, ErrorCode.SERVICE_UNAVAILABLE)

      expect(getUserFriendlyMessage(error, "pt")).toBe(
        "Serviço temporariamente indisponível. Tente novamente mais tarde"
      )
    })

    it("should handle AppError instances", () => {
      const error = new ForbiddenError()
      const message = getUserFriendlyMessage(error, "pt")

      expect(message).toBe("Você não tem permissão para realizar esta ação")
    })
  })
})
