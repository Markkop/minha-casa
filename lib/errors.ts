/**
 * Centralized Error Handling System
 *
 * This module provides custom error classes and utilities for consistent
 * error handling across API routes and client-side code.
 */

import { NextResponse } from "next/server"

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized error codes for the application.
 * These codes can be used by clients to handle specific error cases.
 */
export const ErrorCode = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // External services
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Database errors
  DATABASE_ERROR: "DATABASE_ERROR",

  // General errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// ============================================================================
// ERROR INTERFACES
// ============================================================================

/**
 * Standard error response structure for API endpoints
 */
export interface ApiErrorResponse {
  error: string
  code: ErrorCodeType
  details?: Record<string, unknown>
  timestamp: string
}

/**
 * Options for creating an AppError
 */
export interface AppErrorOptions {
  message: string
  code: ErrorCodeType
  statusCode: number
  details?: Record<string, unknown>
  cause?: Error
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Base application error class with error code and status code support
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly timestamp: string

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = "AppError"
    this.code = options.code
    this.statusCode = options.statusCode
    this.details = options.details
    this.timestamp = new Date().toISOString()

    if (options.cause) {
      this.cause = options.cause
    }

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert to API response format
   */
  toJSON(): ApiErrorResponse {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    }
  }

  /**
   * Convert to NextResponse
   */
  toResponse(): NextResponse<ApiErrorResponse> {
    return NextResponse.json(this.toJSON(), { status: this.statusCode })
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", details?: Record<string, unknown>) {
    super({
      message,
      code: ErrorCode.UNAUTHORIZED,
      statusCode: 401,
      details,
    })
    this.name = "UnauthorizedError"
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = "Access denied", details?: Record<string, unknown>) {
    super({
      message,
      code: ErrorCode.FORBIDDEN,
      statusCode: 403,
      details,
    })
    this.name = "ForbiddenError"
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", details?: Record<string, unknown>) {
    super({
      message: `${resource} not found`,
      code: ErrorCode.NOT_FOUND,
      statusCode: 404,
      details,
    })
    this.name = "NotFoundError"
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      code: ErrorCode.VALIDATION_ERROR,
      statusCode: 400,
      details,
    })
    this.name = "ValidationError"
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      code: ErrorCode.CONFLICT,
      statusCode: 409,
      details,
    })
    this.name = "ConflictError"
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.", details?: Record<string, unknown>) {
    super({
      message,
      code: ErrorCode.RATE_LIMITED,
      statusCode: 429,
      details,
    })
    this.name = "RateLimitError"
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service = "Service", details?: Record<string, unknown>) {
    super({
      message: `${service} is temporarily unavailable`,
      code: ErrorCode.SERVICE_UNAVAILABLE,
      statusCode: 503,
      details,
    })
    this.name = "ServiceUnavailableError"
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred", cause?: Error) {
    super({
      message,
      code: ErrorCode.INTERNAL_ERROR,
      statusCode: 500,
      cause,
    })
    this.name = "InternalError"
  }
}

// ============================================================================
// ERROR HANDLER UTILITIES
// ============================================================================

/**
 * Check if an error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new InternalError(error.message, error)
  }

  return new InternalError("An unknown error occurred")
}

/**
 * Handle errors in API routes and return appropriate responses.
 * Logs the error and returns a consistent error response.
 *
 * @param error - The error to handle
 * @param context - Optional context string for logging
 * @returns NextResponse with appropriate error details
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const appError = toAppError(error)

  // Log the error for debugging (in production, you might want to use a proper logger)
  const logContext = context ? `[${context}]` : ""
  console.error(`${logContext} ${appError.name}: ${appError.message}`, {
    code: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
    stack: appError.stack,
    cause: appError.cause,
  })

  return appError.toResponse()
}

/**
 * Create a success response with consistent formatting
 */
export function successResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status })
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Require a session, throwing UnauthorizedError if not present
 */
export function requireAuth<T extends { user: { id: string } }>(
  session: T | null
): asserts session is T {
  if (!session?.user) {
    throw new UnauthorizedError()
  }
}

/**
 * Require a field to be present
 */
export function requireField<T>(
  value: T | undefined | null,
  fieldName: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`, {
      field: fieldName,
    })
  }
}

/**
 * Require a string field to be present and non-empty
 */
export function requireString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${fieldName} is required`, {
      field: fieldName,
    })
  }
}

/**
 * Require a resource to exist
 */
export function requireResource<T>(
  value: T | undefined | null,
  resourceName: string
): asserts value is T {
  if (value === undefined || value === null) {
    throw new NotFoundError(resourceName)
  }
}

// ============================================================================
// CLIENT-SIDE ERROR UTILITIES
// ============================================================================

/**
 * Error class for client-side API errors with additional context
 */
export class ApiError extends Error {
  public readonly status: number
  public readonly code: ErrorCodeType
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    code: ErrorCodeType = ErrorCode.UNKNOWN_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Check if this is a specific error code
   */
  is(code: ErrorCodeType): boolean {
    return this.code === code
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.code === ErrorCode.UNAUTHORIZED || this.code === ErrorCode.SESSION_EXPIRED
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.code === ErrorCode.VALIDATION_ERROR || this.code === ErrorCode.INVALID_INPUT
  }

  /**
   * Check if this is a not found error
   */
  isNotFoundError(): boolean {
    return this.code === ErrorCode.NOT_FOUND
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return (
      this.code === ErrorCode.RATE_LIMITED ||
      this.code === ErrorCode.SERVICE_UNAVAILABLE ||
      this.code === ErrorCode.INTERNAL_ERROR
    )
  }
}

/**
 * Parse an error response from the API
 */
export async function parseApiErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = await response.json() as Partial<ApiErrorResponse>
    return new ApiError(
      data.error || `HTTP error ${response.status}`,
      response.status,
      data.code || ErrorCode.UNKNOWN_ERROR,
      data.details
    )
  } catch {
    return new ApiError(
      `HTTP error ${response.status}`,
      response.status,
      ErrorCode.UNKNOWN_ERROR
    )
  }
}

/**
 * Get a user-friendly error message based on the error code
 */
export function getUserFriendlyMessage(error: ApiError | AppError, locale: "en" | "pt" = "pt"): string {
  const messages: Record<ErrorCodeType, Record<"en" | "pt", string>> = {
    [ErrorCode.UNAUTHORIZED]: {
      en: "Please sign in to continue",
      pt: "Por favor, faça login para continuar",
    },
    [ErrorCode.FORBIDDEN]: {
      en: "You don't have permission to perform this action",
      pt: "Você não tem permissão para realizar esta ação",
    },
    [ErrorCode.SESSION_EXPIRED]: {
      en: "Your session has expired. Please sign in again",
      pt: "Sua sessão expirou. Por favor, faça login novamente",
    },
    [ErrorCode.VALIDATION_ERROR]: {
      en: error.message,
      pt: error.message,
    },
    [ErrorCode.INVALID_INPUT]: {
      en: "Please check your input and try again",
      pt: "Por favor, verifique seus dados e tente novamente",
    },
    [ErrorCode.MISSING_REQUIRED_FIELD]: {
      en: "Please fill in all required fields",
      pt: "Por favor, preencha todos os campos obrigatórios",
    },
    [ErrorCode.NOT_FOUND]: {
      en: error.message,
      pt: error.message.replace("not found", "não encontrado(a)"),
    },
    [ErrorCode.ALREADY_EXISTS]: {
      en: "This resource already exists",
      pt: "Este recurso já existe",
    },
    [ErrorCode.CONFLICT]: {
      en: error.message,
      pt: error.message,
    },
    [ErrorCode.RATE_LIMITED]: {
      en: "Too many requests. Please wait a moment and try again",
      pt: "Muitas requisições. Por favor, aguarde um momento e tente novamente",
    },
    [ErrorCode.SERVICE_UNAVAILABLE]: {
      en: "Service is temporarily unavailable. Please try again later",
      pt: "Serviço temporariamente indisponível. Tente novamente mais tarde",
    },
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
      en: "An external service error occurred. Please try again later",
      pt: "Erro em serviço externo. Tente novamente mais tarde",
    },
    [ErrorCode.DATABASE_ERROR]: {
      en: "A database error occurred. Please try again later",
      pt: "Erro no banco de dados. Tente novamente mais tarde",
    },
    [ErrorCode.INTERNAL_ERROR]: {
      en: "An unexpected error occurred. Please try again later",
      pt: "Ocorreu um erro inesperado. Tente novamente mais tarde",
    },
    [ErrorCode.UNKNOWN_ERROR]: {
      en: "An unknown error occurred. Please try again later",
      pt: "Ocorreu um erro desconhecido. Tente novamente mais tarde",
    },
  }

  return messages[error.code]?.[locale] || error.message
}
