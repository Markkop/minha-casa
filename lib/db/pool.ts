import { Pool, type PoolConfig } from "pg"

const globalForPg = globalThis as typeof globalThis & {
  minhaCasaPgPool?: Pool
}

/** Strip sslmode from URL — pg treats `sslmode=require` like verify-full and ignores `rejectUnauthorized`. */
function connectionStringWithoutSslMode(url: string): string {
  const without = url.replace(/([?&])sslmode=[^&]*/gi, (_, sep) => sep)
  return without.replace(/\?&/, "?").replace(/\?$/, "").replace(/&$/, "")
}

function getPoolConfig(): PoolConfig {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=(require|verify-full|verify-ca|prefer)/i.test(rawUrl)

  const connectionString = sslEnabled ? connectionStringWithoutSslMode(rawUrl) : rawUrl
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
