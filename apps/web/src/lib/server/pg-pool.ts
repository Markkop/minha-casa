import { Pool, type PoolConfig } from "pg";

const globalForPg = globalThis as typeof globalThis & {
  minhaCasaAuthPgPool?: Pool;
};

function connectionStringWithoutSslMode(url: string): string {
  const without = url.replace(/([?&])sslmode=[^&]*/gi, (_, separator) => separator);
  return without.replace(/\?&/, "?").replace(/\?$/, "").replace(/&$/, "");
}

export function getAuthPoolConfig(): PoolConfig {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sslEnabled =
    process.env.DATABASE_SSL === "true" ||
    /sslmode=(require|verify-full|verify-ca|prefer)/i.test(rawUrl);
  const connectionString = sslEnabled ? connectionStringWithoutSslMode(rawUrl) : rawUrl;
  const configuredMax = Number.parseInt(process.env.DATABASE_POOL_MAX || "5", 10);

  return {
    connectionString,
    max: Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 5,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  };
}

export function getAuthPgPool(): Pool {
  if (!globalForPg.minhaCasaAuthPgPool) {
    globalForPg.minhaCasaAuthPgPool = new Pool(getAuthPoolConfig());
  }

  return globalForPg.minhaCasaAuthPgPool;
}
