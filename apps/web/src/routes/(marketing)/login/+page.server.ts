import { fail, redirect } from "@sveltejs/kit";
import { getAuth } from "$lib/auth";
import { applyAuthResponseCookies } from "$lib/server/apply-auth-response-cookies";
import type { Actions } from "./$types";

export const actions = {
  login: async ({ request, cookies, url }) => {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return fail(400, { error: "Email e senha são obrigatórios.", email });
    }

    const response = await getAuth().api.signInEmail({
      body: { email, password },
      headers: request.headers,
      asResponse: true
    });

    if (!response.ok) {
      let message = "Não foi possível entrar.";
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // ignore parse errors
      }
      return fail(401, { error: message, email });
    }

    applyAuthResponseCookies(response, cookies);
    const redirectTo = url.searchParams.get("redirect") || "/anuncios";
    throw redirect(303, redirectTo);
  }
} satisfies Actions;
