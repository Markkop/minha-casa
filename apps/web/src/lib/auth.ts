import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

function connectionString() {
  return (
    process.env.DATABASE_URL_WEB ??
    process.env.DATABASE_URL ??
    "postgresql://minhacasa:minhacasa_local_password@localhost:5435/minha_casa_local"
  );
}

function getPool(): Pool {
  if (process.env.NODE_ENV === "production") {
    return new Pool({ connectionString: connectionString() });
  }

  const key = "__minhaCasaBetterAuthPool";
  const bag = globalThis as Record<string, unknown>;
  if (!bag[key]) {
    bag[key] = new Pool({ connectionString: connectionString() });
  }
  return bag[key] as Pool;
}

function trustedOrigins() {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const auth = betterAuth({
  basePath: "/auth",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: getPool(),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string
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
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
