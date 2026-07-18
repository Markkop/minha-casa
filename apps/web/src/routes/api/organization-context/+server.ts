import { json } from "@sveltejs/kit";
import { getAuth } from "$lib/auth";
import {
  resolveActiveOrganizationId,
  setActiveOrganizationCookie,
  userIsOrganizationMember
} from "$lib/server/organization-context";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, cookies }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await resolveActiveOrganizationId(
    cookies,
    session.user.id,
    request.headers
  );
  return json({ organizationId });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { organizationId?: string | null };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body.organizationId;
  const organizationId =
    raw === null || raw === undefined || raw === ""
      ? null
      : typeof raw === "string"
        ? raw.trim()
        : null;

  if (organizationId) {
    const isMember = await userIsOrganizationMember(
      session.user.id,
      organizationId,
      request.headers
    );
    if (!isMember) {
      return json({ error: "You are not a member of this organization" }, { status: 403 });
    }
    setActiveOrganizationCookie(cookies, organizationId);
    return json({ organizationId });
  }

  setActiveOrganizationCookie(cookies, null);
  return json({ organizationId: null });
};
