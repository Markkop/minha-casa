import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"
import { getPgPool } from "./pool"

/**
 * Get the PostgreSQL database client.
 * Uses DATABASE_URL and a small shared pg Pool, suitable for Vercel + VPS Postgres.
 */
export function getDb() {
  return drizzle(getPgPool(), { schema })
}

// Export schema and types for convenience
export * from "./schema"
export type Database = ReturnType<typeof getDb>
