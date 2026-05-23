import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getDb, listingShortLinks, listings } from "@/lib/db"

type RouteContext = {
  params: Promise<{ shortId: string }>
}

function appBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_PUBLIC_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  const url = new URL(request.url)
  return url.origin
}

function listingAppUrl(
  base: string,
  collectionId: string,
  listingId: string
): string {
  return `${base}/anuncios?collection=${collectionId}&listing=${listingId}`
}

export async function GET(request: Request, context: RouteContext) {
  const { shortId } = await context.params
  const normalized = shortId?.trim().toLowerCase()

  if (!normalized || !/^[a-z0-9]{4,12}$/.test(normalized)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const db = getDb()
  const [row] = await db
    .select({
      listingId: listingShortLinks.listingId,
      collectionId: listingShortLinks.collectionId,
      data: listings.data,
    })
    .from(listingShortLinks)
    .innerJoin(listings, eq(listingShortLinks.listingId, listings.id))
    .where(eq(listingShortLinks.shortId, normalized))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const base = appBaseUrl(request)
  const externalLink = row.data?.link?.trim()

  if (externalLink) {
    try {
      const parsed = new URL(externalLink)
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return NextResponse.redirect(externalLink, 302)
      }
    } catch {
      // fall through to app URL
    }
  }

  return NextResponse.redirect(
    listingAppUrl(base, row.collectionId, row.listingId),
    302
  )
}
