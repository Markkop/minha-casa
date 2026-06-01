import { env } from "$env/dynamic/private";

/** Bridge SvelteKit-loaded .env into process.env for shared `lib/db` (Better Auth, Drizzle). */
const KEYS = [
  "DATABASE_URL",
  "DATABASE_SSL",
  "DATABASE_POOL_MAX",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "BACKEND_API_URL",
  "INTERNAL_BACKEND_URL",
  "INTERNAL_API_SECRET",
  "PUBLIC_API_URL",
  "PHOENIX_API_URL"
] as const;

for (const key of KEYS) {
  const value = env[key];
  if (value !== undefined && value !== "" && process.env[key] === undefined) {
    process.env[key] = value;
  }
}
