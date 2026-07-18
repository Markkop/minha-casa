import { afterEach, describe, expect, it } from "vitest";
import { getAuthPoolConfig } from "./pg-pool";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDatabaseSsl = process.env.DATABASE_SSL;
const originalPoolMax = process.env.DATABASE_POOL_MAX;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDatabaseSsl === undefined) delete process.env.DATABASE_SSL;
  else process.env.DATABASE_SSL = originalDatabaseSsl;
  if (originalPoolMax === undefined) delete process.env.DATABASE_POOL_MAX;
  else process.env.DATABASE_POOL_MAX = originalPoolMax;
});

describe("Better Auth PostgreSQL pool", () => {
  it("uses a small pool for local PostgreSQL", () => {
    process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/minha_casa";
    delete process.env.DATABASE_SSL;
    process.env.DATABASE_POOL_MAX = "7";

    expect(getAuthPoolConfig()).toEqual({
      connectionString: "postgresql://user:password@localhost:5432/minha_casa",
      max: 7,
      ssl: undefined
    });
  });

  it("translates sslmode into the explicit pg TLS configuration", () => {
    process.env.DATABASE_URL =
      "postgresql://user:password@db.example/minha_casa?sslmode=require";
    delete process.env.DATABASE_SSL;
    process.env.DATABASE_POOL_MAX = "invalid";

    expect(getAuthPoolConfig()).toEqual({
      connectionString: "postgresql://user:password@db.example/minha_casa",
      max: 5,
      ssl: { rejectUnauthorized: false }
    });
  });
});
