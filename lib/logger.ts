/**
 * Structured logging utility for better observability
 * 
 * Outputs JSON-formatted logs that can be parsed by log aggregation tools.
 * Includes consistent context fields for Stripe operations.
 */

type LogLevel = "info" | "warn" | "error"

export interface LogContext {
  // Stripe-specific fields
  eventId?: string           // Stripe webhook event ID (evt_...)
  eventType?: string         // Stripe event type (e.g., checkout.session.completed)
  requestId?: string         // Stripe request ID from response headers
  customerId?: string        // Stripe customer ID (cus_...)
  subscriptionId?: string    // Stripe subscription ID (sub_...)
  invoiceId?: string         // Stripe invoice ID (in_...)
  sessionId?: string         // Stripe checkout session ID (cs_...)
  
  // Application-specific fields
  userId?: string            // Our internal user ID
  planId?: string            // Our internal plan ID
  localSubscriptionId?: string  // Our internal subscription ID
  
  // Error context
  error?: string
  stack?: string
  
  // Additional context
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
}

/**
 * Log a structured message
 */
export function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context
  }

  // In production, output JSON for log aggregation
  // In development, use more readable format
  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify(entry))
  } else {
    // Development: more readable format
    const contextStr = context ? ` ${JSON.stringify(context)}` : ""
    console[level](`[${entry.timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`)
  }
}

/**
 * Log info level message
 */
export function logInfo(message: string, context?: LogContext): void {
  log("info", message, context)
}

/**
 * Log warning level message
 */
export function logWarn(message: string, context?: LogContext): void {
  log("warn", message, context)
}

/**
 * Log error level message
 */
export function logError(message: string, context?: LogContext): void {
  log("error", message, context)
}

/**
 * Create a logger with preset context (e.g., for a webhook handler)
 */
export function createLogger(baseContext: LogContext) {
  return {
    info: (message: string, additionalContext?: LogContext) => 
      logInfo(message, { ...baseContext, ...additionalContext }),
    warn: (message: string, additionalContext?: LogContext) => 
      logWarn(message, { ...baseContext, ...additionalContext }),
    error: (message: string, additionalContext?: LogContext) => 
      logError(message, { ...baseContext, ...additionalContext }),
  }
}
