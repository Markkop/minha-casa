import { env } from "$env/dynamic/private";
import type { RequestHandler } from "./$types";
import {
  and,
  collections,
  eq,
  getDb,
  listings,
  organizationMembers
} from "@minha-casa/db";

function backendBaseUrl(): string | null {
  const raw =
    env.INTERNAL_BACKEND_URL ??
    env.BACKEND_API_URL ??
    env.PHOENIX_API_URL ??
    env.PUBLIC_API_URL ??
    "http://localhost:4000";
  const value = raw.trim().replace(/^["']+|["']+$/g, "").replace(/\/+$/, "");
  return value || null;
}

function internalSecret(): string | null {
  const raw = env.INTERNAL_API_SECRET?.trim();
  return raw ? raw.replace(/^["']+|["']+$/g, "") : null;
}

export const GET: RequestHandler = async ({ locals, params }) => {
  const userId = locals.user?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const imageIndex = Number.parseInt(params.index, 10);
  if (!Number.isInteger(imageIndex) || imageIndex < 0) {
    return Response.json({ error: "Invalid image index" }, { status: 400 });
  }

  const db = getDb();
  const [listing] = await db.select().from(listings).where(eq(listings.id, params.id));
  if (!listing) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, listing.collectionId));
  if (!collection) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  const canAccessPersonal = collection.userId === userId;
  const canAccessOrg = collection.orgId
    ? (
        await db
          .select({ id: organizationMembers.id })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.orgId, collection.orgId),
              eq(organizationMembers.userId, userId)
            )
          )
          .limit(1)
      ).length > 0
    : false;

  if (!canAccessPersonal && !canAccessOrg) {
    return Response.json({ error: "Image not found" }, { status: 404 });
  }

  const backendUrl = backendBaseUrl();
  if (!backendUrl) {
    return Response.json({ error: "Backend API not configured" }, { status: 503 });
  }

  const headers = new Headers({
    "x-minha-casa-user-id": userId
  });
  if (collection.orgId) headers.set("x-minha-casa-org-id", collection.orgId);
  const secret = internalSecret();
  if (secret) headers.set("authorization", `Bearer ${secret}`);

  const upstream = await fetch(
    `${backendUrl}/api/listings/${params.id}/images/${imageIndex}`,
    {
      headers,
      cache: "no-store"
    }
  );

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: "Image not found" },
      { status: upstream.status === 401 ? 401 : 404 }
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", upstream.headers.get("content-type") ?? "image/jpeg");
  responseHeaders.set("cache-control", "private, max-age=86400");

  return new Response(upstream.body, {
    status: 200,
    headers: responseHeaders
  });
};
