# Listing image ingest (hosted)

Listing photos are scraped from the ad URL, downloaded server-side, stored in MinIO, and served through same-origin Next.js routes (no CORS on portal URLs).

## Flow

1. URL parse returns fields only (no `imageUrls`).
2. Creating a listing with a `link` sets `imageIngestionStatus: pending` and enqueues `ListingImageIngestionWorker` (Phoenix Oban, queue `:images`).
3. Worker scrapes (ScrapingAnt), downloads up to 40 images (Req), uploads to `listings/{listingId}/{index}.jpg` in MinIO, updates `listings.data` with `imageStorageKeys` and app paths `/api/listings/{id}/images/{n}`.
4. UI polls every 3s while status is `pending` or `processing`; thumbnails show a spinner.

## Deploy

1. **VPS**: Rebuild Phoenix after backend changes:
   ```bash
   cd /docker/minha-casa
   git pull origin main
   docker compose -f infra/vps/docker-compose.db.yml build phoenix-api
   docker compose -f infra/vps/docker-compose.db.yml up -d phoenix-api
   ```
2. **Vercel**: Deploys automatically on push (new API routes under `app/api/listings/.../images` and `app/api/shared/.../images`).
3. **Env** (already required for parse): `INTERNAL_BACKEND_URL`, `INTERNAL_API_SECRET`, MinIO vars on Phoenix.

## API

| Route | Purpose |
|-------|---------|
| `POST /api/listings/:id/pull-images` | Enqueue overwrite ingest (proxies Phoenix) |
| `GET /api/listings/:id/images/:index` | Stream image (session) |
| `GET /api/shared/:token/listings/:id/images/:index` | Stream image (share) |
| Phoenix `POST /api/listings/:id/ingest-images` | Internal enqueue |
| Phoenix `GET /api/listings/:id/images/:index` | Internal stream |
