import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/load-env", () => ({}));

import { AUTH_MODEL_CONFIG } from "./auth";

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
