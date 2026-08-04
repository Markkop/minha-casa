# Production on Coolify

Minha Casa is self-hosted on the shared Hostinger VPS as a Git-backed Docker
Compose application managed by Coolify. The production manifest is
`infra/coolify/docker-compose.yml`.

## Deployment flow

1. `git push origin main` pushes to GitHub and Forgejo.
2. Forgejo calls the authenticated deploy webhook for the Minha Casa resource.
3. Coolify clones Forgejo with a deploy key and builds the Phoenix and SvelteKit
   images directly from the repository.
4. Phoenix runs `MinhaCasaAi.Release.migrate()` before starting. A failed
   migration prevents the API health check from passing.

Forgejo Actions, its runner, registry application images, Dokploy labels, and
the old SSH deploy script are not used.

## Production stack

The Coolify Compose resource contains:

- PostgreSQL 17 with `minha_casa_prod` and `langfuse` databases.
- Phoenix API, SvelteKit web, Hermes Agent, and shared Hermes jobs storage.
- MinIO plus the idempotent bucket initializer.
- Langfuse v3, ClickHouse 24.8, and Redis 7.

The migration intentionally pins the third-party image digests that were
running before the cutover. Upgrade Langfuse/ClickHouse independently; Langfuse
v4 must not be introduced as part of an infrastructure migration.

Public routing remains:

| Service | URL |
|---|---|
| SvelteKit | `https://casas.markkop.dev` |
| Phoenix | `https://api.casas.markkop.dev` |
| MinIO S3 API | `https://s3.casas.markkop.dev` |
| MinIO console | `https://minio.casas.markkop.dev` |
| Langfuse | `https://langfuse.casas.markkop.dev` |

Secrets live in Coolify. Required and optional variables are declared in the
Compose file; `infra/coolify/.env.prod.example` is only a safe reference inventory.

## Database access

PostgreSQL is bound only to VPS loopback port 5433. Application services use
`minha-casa-db:5432` on the private Compose network.

For administrative access, create an SSH tunnel:

```bash
VPS_TARGET="$(sed -n '1p' .ssh-prod)"
VPS_PASSWORD="$(sed -n '2p' .ssh-prod)"
sshpass -p "$VPS_PASSWORD" ssh -N \
  -L 5433:127.0.0.1:5433 \
  -o StrictHostKeyChecking=no "$VPS_TARGET"
```

Then connect to `127.0.0.1:5433`. The SSH tunnel provides transport
encryption, so local tunnel clients use `DATABASE_SSL=false`. Do not expose
5433 publicly and do not run schema migrations from a developer laptop.

## Operations

Use `https://coolify.markkop.dev` for deployments, logs, service terminals,
health, restarts, and environment variables.

Daily PostgreSQL dumps are stored in:

```text
/docker/backups/coolify/minha-casa
```

Weekly maintenance archives preserve MinIO, Hermes, and ClickHouse volumes.
ClickHouse must be stopped temporarily for a consistent volume archive. Redis
is transient and is not restored.

These backups are local to the VPS and do not protect against total VPS or disk
loss. Validate dumps with `pg_restore --list`, archives with `tar -tzf`, and
perform periodic scratch restores.

Do not use `docker compose down -v` and do not delete any named volume through
Coolify without a separately verified backup.

## Deployment verification

```bash
curl -fsS https://api.casas.markkop.dev/health
curl -fsS -o /dev/null https://casas.markkop.dev/
curl -fsS -o /dev/null https://s3.casas.markkop.dev/
curl -fsS -o /dev/null https://langfuse.casas.markkop.dev/
```

Also verify in Coolify that migrations completed and all long-running services
are healthy. Test an authenticated API request, one MinIO object round-trip,
Hermes connectivity, and one Langfuse trace before declaring a deployment
complete.

## OAuth and webhooks

Production domains and callback URLs are unchanged:

- Google OAuth callback: `https://casas.markkop.dev/api/auth/callback/google`
- Stripe and messaging webhook URLs retain their current public hostnames.

No provider-side callback change is required for the Coolify migration.
