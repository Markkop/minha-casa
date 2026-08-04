# Production on Coolify

Minha Casa is self-hosted on the shared Hostinger VPS as a Git-backed Docker
Compose application managed by Coolify. The production manifest is
`infra/coolify/docker-compose.yml`.

## Deployment flow

1. `git push origin main` pushes to GitHub and Forgejo.
2. Forgejo calls Coolify's HMAC-authenticated Gitea webhook for the Minha Casa
   resource on pushes to `main`.
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

The Compose file deliberately bind-mounts the existing data directories below
`/var/lib/docker/volumes`. Coolify rewrites named Compose volumes to
resource-scoped names, including volumes declared `external`; changing these
bind paths would silently start the services with empty storage. Verify every
mount against `docker inspect` before changing a data service.

Forgejo is a separate Coolify custom service defined by
`infra/coolify/forgejo-compose.yml`. It reuses
`forgejo_forgejo_db_data` through its host data path and
`/docker/forgejo/forgejo-data` for repositories.

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
/docker/backups/coolify/minha-casa/daily
```

The versioned backup implementation is `infra/coolify/backup-vps.sh`; it is
installed as `/usr/local/sbin/coolify-local-backup`. Cron runs verified logical
dumps daily at 03:15 UTC and a cold archive Sundays at 04:15 UTC. Daily dumps
are retained for 14 days. Four weeks of cold archives are retained under
`/docker/backups/coolify/weekly` and include MinIO, Hermes, ClickHouse, Forgejo
repositories, and the Coolify control-plane configuration and SSH keys.

The weekly job briefly stops the Minha Casa writers and Forgejo while it
archives their state, then restarts the exact containers it stopped. Redis is
transient and is not restored. The cron definition is versioned at
`infra/coolify/coolify-local-backups.cron` and installed under `/etc/cron.d`.

These backups are local to the VPS and do not protect against total VPS or disk
loss. Validate dumps with `pg_restore --list`, archives with `tar -tzf`, and
perform periodic scratch restores.

The cutover snapshot is retained at
`/docker/backups/pre-coolify-20260804T173458Z`, with a separately verified copy
at `~/Backups/minha-casa-coolify/pre-coolify-20260804T173458Z` on the operator
workstation. The former Dokploy/Swarm containers and volumes remain stopped for
the seven-day rollback window; do not start them beside Coolify because their
published ports and data mounts overlap.

Do not use `docker compose down -v`, edit the persisted-data bind paths, or
delete their backing Docker volumes without a separately verified backup.

## Deployment verification

```bash
curl -fsS https://api.casas.markkop.dev/health
curl -fsS -o /dev/null https://casas.markkop.dev/
test "$(curl -sS -o /dev/null -w '%{http_code}' https://s3.casas.markkop.dev/)" = 403
curl -fsS -o /dev/null https://langfuse.casas.markkop.dev/
```

Also verify in Coolify that migrations completed and all long-running services
are healthy. Test an authenticated API request, one MinIO object round-trip,
Hermes connectivity, and one Langfuse trace before declaring a deployment
complete.

The S3 root intentionally returns HTTP 403 without credentials; that proves the
MinIO router is reachable and is not a failed health check.

## Coolify control plane

`infra/coolify/docker-compose.control-plane.yml` is installed as
`/data/coolify/source/docker-compose.custom.yml`. It binds Coolify ports 8000,
6001, and 6002 to VPS loopback; the public dashboard and realtime connections
use `https://coolify.markkop.dev` through Traefik. Keep the Hostinger provider
firewall limited to TCP 22, 80, 443, and 2222 (plus UDP 443 if HTTP/3 is
desired), and explicitly block public TCP 8080. Docker-published ports can
bypass UFW, so provider firewall rules are the authoritative perimeter.

Coolify API access is disabled after migration, and automatic Coolify updates
are disabled for production. Take a verified control-plane backup and apply
updates manually from the dashboard.

## OAuth and webhooks

Production domains and callback URLs are unchanged:

- Google OAuth callback: `https://casas.markkop.dev/api/auth/callback/google`
- Stripe and messaging webhook URLs retain their current public hostnames.

No provider-side callback change is required for the Coolify migration.
