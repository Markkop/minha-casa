export function unauthenticatedApiResponse(pathname: string): Response | null {
  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    return null;
  }

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  });
}
