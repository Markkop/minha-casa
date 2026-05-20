import { Pool, type PoolConfig } from "pg"

const globalForPg = globalThis as typeof globalThis & {
  minhaCasaPgPool?: Pool
}

function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const sslEnabled = process.env.DATABASE_SSL === "true" || connectionString.includes("sslmode=require")
  const max = Number.parseInt(process.env.DATABASE_POOL_MAX || "5", 10)

  return {
    connectionString,
    max: Number.isFinite(max) && max > 0 ? max : 5,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  }
}

export function getPgPool() {
  if (!globalForPg.minhaCasaPgPool) {
    globalForPg.minhaCasaPgPool = new Pool(getPoolConfig())
  }

  return globalForPg.minhaCasaPgPool
}
