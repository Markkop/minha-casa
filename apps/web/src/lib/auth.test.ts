import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/load-env", () => ({}));

import {
  AUTH_MODEL_CONFIG,
  createRetentionDatabaseHooks,
  recordLoginActivity,
  RETENTION_DATABASE_HOOKS,
  RETENTION_LOGIN_SQL
} from "./auth";

describe("Better Auth database mapping", () => {
  it("maps every Better Auth model to the existing plural snake-case schema", () => {
    expect(AUTH_MODEL_CONFIG).toMatchObject({
      user: {
        modelName: "users",
        fields: { emailVerified: "email_verified" },
        additionalFields: { isAdmin: { fieldName: "is_admin" } }
      },
      account: {
        modelName: "accounts",
        fields: { userId: "user_id", providerId: "provider_id" }
      },
      session: {
        modelName: "sessions",
        fields: { userId: "user_id", expiresAt: "expires_at" }
      },
      verification: {
        modelName: "verifications",
        fields: { expiresAt: "expires_at" }
      },
      jwks: {
        modelName: "jwks",
        fields: { publicKey: "public_key", privateKey: "private_key" }
      }
    });
  });
});

describe("retention login activity", () => {
  it("calls the database-owned refresh function with the authenticated user", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ refreshed_workspace_count: 2 }] });

    await recordLoginActivity("5de6bd2a-16f8-4ca8-b8fb-36d62715179c", {
      query
    } as never);

    expect(query).toHaveBeenCalledWith(RETENTION_LOGIN_SQL, [
      "5de6bd2a-16f8-4ca8-b8fb-36d62715179c"
    ]);
  });

  it("wires the refresh to Better Auth session creation", async () => {
    const recordActivity = vi.fn().mockResolvedValue(undefined);
    const hooks = createRetentionDatabaseHooks(recordActivity);

    await hooks.session.create.after({
      userId: "0aa3bd55-0fe2-4f5b-b4bf-17a79fb0fbb2"
    });

    expect(recordActivity).toHaveBeenCalledWith("0aa3bd55-0fe2-4f5b-b4bf-17a79fb0fbb2");
    expect(RETENTION_DATABASE_HOOKS.session.create.after).toBeTypeOf("function");
  });

  it("logs retention failures without blocking session creation during deploys", async () => {
    const error = new Error("refresh_retention_on_login does not exist");
    const recordActivity = vi.fn().mockRejectedValue(error);
    const reportError = vi.fn();
    const hooks = createRetentionDatabaseHooks(recordActivity, reportError);

    await expect(
      hooks.session.create.after({
        userId: "95885a54-c7e1-4779-aa4a-da2b61a0c8b2"
      })
    ).resolves.toBeUndefined();

    expect(reportError).toHaveBeenCalledWith(
      "95885a54-c7e1-4779-aa4a-da2b61a0c8b2",
      error
    );
  });
});
