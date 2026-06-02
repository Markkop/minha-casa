import { fail, redirect } from "@sveltejs/kit";
import { getAuth } from "$lib/auth";
import { applyAuthResponseCookies } from "$lib/server/apply-auth-response-cookies";
import type { Actions } from "./$types";

export const actions = {
  signup: async ({ request, cookies, url }) => {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!name || !email || !password) {
      return fail(400, { error: "Nome, email e senha são obrigatórios.", name, email });
    }

    const response = await getAuth().api.signUpEmail({
      body: { name, email, password },
      headers: request.headers,
      asResponse: true
    });

    if (!response.ok) {
      let message = "Não foi possível criar sua conta.";
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // ignore parse errors
      }
      return fail(400, { error: message, name, email });
    }

    applyAuthResponseCookies(response, cookies);
    const redirectTo = url.searchParams.get("redirect") || "/anuncios";
    throw redirect(303, redirectTo);
  }
} satisfies Actions;
