import { defineConfig } from "drizzle-kit"

function migrateSslOption() {
  const url = process.env.DATABASE_URL ?? ""
  const sslEnabled =
    process.env.DATABASE_SSL === "true" || url.includes("sslmode=require")
  return sslEnabled ? { rejectUnauthorized: false as const } : undefined
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: migrateSslOption(),
  },
  verbose: true,
  strict: true,
})
