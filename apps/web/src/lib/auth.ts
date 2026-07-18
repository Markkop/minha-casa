import "$lib/server/load-env";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { getAuthPgPool } from "$lib/server/pg-pool";

export const RETENTION_LOGIN_SQL =
  "SELECT refresh_retention_on_login($1::uuid) AS refreshed_workspace_count";

type RetentionQueryPool = Pick<ReturnType<typeof getAuthPgPool>, "query">;

export async function recordLoginActivity(
  userId: string,
  pool: RetentionQueryPool = getAuthPgPool()
): Promise<void> {
  await pool.query(RETENTION_LOGIN_SQL, [userId]);
}

function reportRetentionActivityError(userId: string, error: unknown): void {
  console.error("Could not refresh workspace retention after login", {
    userId,
    error
  });
}

export function createRetentionDatabaseHooks(
  recordActivity: (userId: string) => Promise<void> = recordLoginActivity,
  reportError: (userId: string, error: unknown) => void = reportRetentionActivityError
) {
  return {
    session: {
      create: {
        after: async (session: { userId: string }) => {
          try {
            await recordActivity(session.userId);
          } catch (error) {
            reportError(session.userId, error);
          }
        }
      }
    }
  };
}

export const RETENTION_DATABASE_HOOKS = createRetentionDatabaseHooks();

export const AUTH_MODEL_CONFIG = {
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at"
    },
    additionalFields: {
      isAdmin: {
        type: "boolean",
        defaultValue: false,
        input: false,
        fieldName: "is_admin"
      }
    }
  },
  account: {
    modelName: "accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      idToken: "id_token",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  },
  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  },
  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  },
  jwks: {
    modelName: "jwks",
    fields: {
      publicKey: "public_key",
      privateKey: "private_key",
      createdAt: "created_at",
      expiresAt: "expires_at"
    }
  }
} as const;

let authInstance: ReturnType<typeof betterAuth> | undefined;

function trustedOrigins() {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAuth(): ReturnType<typeof betterAuth> {
  if (authInstance) return authInstance;

  authInstance = betterAuth({
    basePath: "/api/auth",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: getAuthPgPool(),
    databaseHooks: RETENTION_DATABASE_HOOKS,
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
      ...AUTH_MODEL_CONFIG.session,
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5
      }
    },
    user: AUTH_MODEL_CONFIG.user,
    account: AUTH_MODEL_CONFIG.account,
    verification: AUTH_MODEL_CONFIG.verification,
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      }
    },
    trustedOrigins: trustedOrigins(),
    plugins: [
      jwt({
        schema: { jwks: AUTH_MODEL_CONFIG.jwks },
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
