import { createAuthClient } from "better-auth/svelte";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/auth",
  plugins: [jwtClient()]
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
