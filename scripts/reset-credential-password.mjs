/**
 * Set a new password for an email/password (credential) user.
 *
 * Usage (from repo root, Node 20+):
 *   node --env-file=.env scripts/reset-credential-password.mjs <email> <new-password>
 *
 * Requires DATABASE_URL. Does not send email; run only in a trusted environment.
 */
import pg from "pg"
import { hashPassword } from "better-auth/crypto"

const [, , email, newPassword] = process.argv

if (!email || !newPassword) {
  console.error(
    "Usage: node --env-file=.env scripts/reset-credential-password.mjs <email> <new-password>"
  )
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.")
  process.exit(1)
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" || databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
})
await client.connect()
const hash = await hashPassword(newPassword)

const result = await client.query(
  `UPDATE accounts AS a
   SET password = $1, updated_at = now()
   FROM users AS u
   WHERE a.user_id = u.id
     AND u.email = $2
     AND a.provider_id = 'credential'
   RETURNING u.email`,
  [hash, email]
)
await client.end()

if (result.rows.length === 0) {
  console.error(
    "No credential account found for that email. Check spelling, or that the user signed up with email/password (not only OAuth)."
  )
  process.exit(1)
}

console.log("Password updated for", result.rows[0].email)
