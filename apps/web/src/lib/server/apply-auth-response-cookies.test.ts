import { describe, expect, it } from "vitest";
import type { Cookies } from "@sveltejs/kit";
import { applyAuthResponseCookies } from "./apply-auth-response-cookies";

describe("applyAuthResponseCookies", () => {
  it("copies combined Set-Cookie headers from auth responses", () => {
    const response = new Response(null, {
      headers: {
        "set-cookie":
          "__Secure-better-auth.session_token=token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800, __Secure-better-auth.session_data=data; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Tue, 02 Jun 2026 10:00:00 GMT"
      }
    });
    const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const cookies = {
      set: (name: string, value: string, options: Record<string, unknown>) =>
        setCalls.push({ name, value, options })
    } as unknown as Cookies;

    applyAuthResponseCookies(response, cookies);

    expect(setCalls).toHaveLength(2);
    expect(setCalls[0]).toMatchObject({
      name: "__Secure-better-auth.session_token",
      value: "token",
      options: { path: "/", httpOnly: true, secure: true, sameSite: "lax", maxAge: 604800 }
    });
    expect(setCalls[1]).toMatchObject({
      name: "__Secure-better-auth.session_data",
      value: "data",
      options: { path: "/", httpOnly: true, secure: true, sameSite: "lax" }
    });
    expect(setCalls[1]?.options.expires).toBeInstanceOf(Date);
  });
});
