import { createAuthClient } from "better-auth/svelte";
import { jwtClient } from "better-auth/client/plugins";

/** Explicit JWT token client — better-auth 1.4.x jwtClient only exposes jwks in getActions. */
const jwtTokenClient = () => ({
  id: "jwt-token-client",
  pathMethods: { "/token": "GET" as const },
  getActions: ($fetch: (path: string, init?: RequestInit) => Promise<unknown>) => ({
    token: (fetchOptions?: RequestInit) =>
      $fetch("/token", {
        method: "GET",
        ...fetchOptions
      })
  })
});

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [jwtClient(), jwtTokenClient()]
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
