import "$lib/server/load-env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { getDb } from "@minha-casa/db";
import * as schema from "@minha-casa/db/schema";

let authInstance: ReturnType<typeof betterAuth> | undefined;

function trustedOrigins() {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAuth(): ReturnType<typeof betterAuth> {
  if (authInstance) return authInstance;

  const db = getDb();
  authInstance = betterAuth({
    basePath: "/api/auth",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        account: schema.accounts,
        session: schema.sessions,
        verification: schema.verifications,
        jwks: schema.jwks
      }
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        prompt: "select_account"
      }
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5
      }
    },
    user: {
      additionalFields: {
        isAdmin: {
          type: "boolean",
          defaultValue: false,
          input: false
        }
      }
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      }
    },
    trustedOrigins: trustedOrigins(),
    plugins: [
      jwt({
        jwt: {
          expirationTime: "1h",
          definePayload: ({ user }) => ({
            id: user.id,
            email: user.email,
            isAdmin: Boolean((user as { isAdmin?: boolean }).isAdmin)
          })
        }
      })
    ]
  }) as unknown as ReturnType<typeof betterAuth>;

  return authInstance;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  }
});

export type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
