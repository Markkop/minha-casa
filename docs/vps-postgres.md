# VPS Postgres for Minha Casa

Minha Casa is intended to run frontend/API routes on Vercel and use a separate Postgres container on the VPS. This keeps it isolated from Todo Idle Quest while reusing the same operational style: Docker Compose, `.env.prod`, health checks, and small debug scripts.

## Files

- `infra/vps/docker-compose.db.yml` — dedicated Postgres 17 container exposed on `${POSTGRES_PUBLIC_PORT:-5433}`.
- `infra/vps/.env.prod.example` — safe template for the VPS `.env.prod`.
- `infra/vps/scripts/generate-postgres-tls.sh` — creates local cert/key for Postgres TLS.
- `infra/vps/scripts/db-status.sh` — shows Compose status and recent DB logs.
- `infra/vps/scripts/db-smoke-test.sh` — runs a read-only `select version(), now();` check.

## First deploy on the VPS

```bash
cd /docker/minha-casa
cp infra/vps/.env.prod.example .env.prod
openssl rand -base64 36 # paste into POSTGRES_PASSWORD in .env.prod
chmod +x infra/vps/scripts/*.sh
./infra/vps/scripts/generate-postgres-tls.sh
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod up -d
./infra/vps/scripts/db-smoke-test.sh
```

## Vercel env vars

Set these in Vercel production/preview as appropriate:

```env
DATABASE_URL=postgresql://minhacasa:<POSTGRES_PASSWORD>@<VPS_HOST>:5433/minha_casa_prod
DATABASE_SSL=true
DATABASE_POOL_MAX=5
BETTER_AUTH_URL=https://<minha-casa-domain>
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_TRUSTED_ORIGINS=https://<minha-casa-domain>,http://localhost:3000
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

Also keep the existing production values for OpenAI, Google Maps, Stripe and share links.

**Production domain (example):** `https://casas.markkop.dev` — use your real hostname in Google OAuth and in `BETTER_AUTH_*` / `NEXT_PUBLIC_APP_URL`.

### Running `pnpm db:migrate` from your laptop (self-signed TLS)

The app uses a self-signed certificate on the VPS. For **local migration**, use `DATABASE_SSL=true` and put **no** `sslmode` in the URL so Drizzle’s TLS config (`rejectUnauthorized: false`) applies:

```env
DATABASE_URL="postgresql://minhacasa:<password>@<VPS_HOST>:5433/minha_casa_prod"
DATABASE_SSL="true"
```

For **Vercel**, use the same pattern: **no** `sslmode` in `DATABASE_URL`, only `DATABASE_SSL=true`. Node `pg` treats `sslmode=require` as strict certificate verification, which breaks the VPS self-signed cert even when `rejectUnauthorized: false` is set in code.

## Google OAuth Console

Use Web Application credentials:

- Authorized JavaScript origins:
  - `https://<minha-casa-domain>`
  - `http://localhost:3000`
- Authorized redirect URIs:
  - `https://<minha-casa-domain>/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google`
- Consent screen links:
  - Homepage: `https://<minha-casa-domain>`
  - Privacy: `https://<minha-casa-domain>/privacy`
  - Terms: `https://<minha-casa-domain>/terms`

## Operations

```bash
# Status and recent logs
./infra/vps/scripts/db-status.sh

# Read-only DB check
./infra/vps/scripts/db-smoke-test.sh

# Restart DB only, preserving volume
docker compose -f infra/vps/docker-compose.db.yml --env-file .env.prod restart minha-casa-db
```

Do not run `docker compose down -v` or `docker volume prune` unless you explicitly intend to delete the Minha Casa database volume.

## Notes

- This setup exposes Postgres publicly so Vercel can connect. It is acceptable for a beta with TLS, strong password, and a low pool size.
- Stronger production options: managed Postgres, static egress allowlisting, private networking, or moving the backend API onto the VPS behind Caddy.
- This stack intentionally does not join `caddy_net` because Vercel connects directly to the DB port; Caddy is only needed if an HTTP service is hosted on the VPS.
