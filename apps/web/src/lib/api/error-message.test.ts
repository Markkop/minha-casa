import { describe, expect, it } from "vitest";
import { formatApiError } from "./error-message";

describe("formatApiError", () => {
  it("returns a network message for status 0 without leaking technical detail", () => {
    expect(
      formatApiError({
        status: 0,
        data: {
          error: "Cannot reach /api/workspace",
          detail: "fetch failed: ECONNREFUSED"
        }
      })
    ).toBe("Sem conexão com o servidor. Verifique sua internet ou tente novamente.");
  });

  it("returns a neutral 502 message without phoenix, docker or hint", () => {
    expect(
      formatApiError({
        status: 502,
        data: {
          error: "Cannot reach Phoenix at http://localhost:4000",
          detail: "fetch failed",
          hint: "Start the app stack: docker compose up -d phoenix-api"
        }
      })
    ).toBe("Não foi possível conectar ao servidor. Tente novamente em instantes.");
  });

  it("maps authentication errors to Portuguese", () => {
    expect(formatApiError({ status: 401, data: { error: "Unauthorized" } })).toBe(
      "Sessão expirada. Faça login novamente."
    );
    expect(formatApiError({ status: 401, data: {} })).toBe(
      "Sessão expirada ou não autorizado. Faça login novamente."
    );
  });

  it("maps permission errors to Portuguese", () => {
    expect(formatApiError({ status: 403, data: { error: "Forbidden" } })).toBe(
      "Você não tem permissão para esta ação."
    );
    expect(formatApiError({ status: 403, data: {} })).toBe(
      "Você não tem permissão para esta ação."
    );
  });

  it("maps known API codes to Portuguese", () => {
    expect(formatApiError({ status: 423, data: { code: "workspace_frozen" } })).toBe(
      "Seu perfil está em modo somente leitura."
    );
    expect(formatApiError({ status: 422, data: { code: "collection_limit" } })).toBe(
      "Você atingiu o limite de coleções do seu plano."
    );
    expect(formatApiError({ status: 422, data: { code: "listing_limit" } })).toBe(
      "Você atingiu o limite de imóveis do seu plano."
    );
    expect(formatApiError({ status: 429, data: { code: "limit_reached" } })).toBe(
      "Limite de uso atingido. Tente novamente mais tarde."
    );
    expect(formatApiError({ status: 409, data: { code: "plan_conflict" } })).toBe(
      "Esta imobiliária já possui uma assinatura ativa."
    );
  });

  it("replaces technical payloads with safe fallbacks", () => {
    expect(
      formatApiError({
        status: 500,
        data: { error: "inspect(%Ecto.Changeset{errors: []})" }
      })
    ).toBe("Não foi possível completar esta ação. Tente novamente.");

    expect(
      formatApiError({
        status: 500,
        data: { error: "OpenAI request failed with HTTP 502" }
      })
    ).toBe("Não foi possível completar esta ação. Tente novamente.");

    expect(
      formatApiError({
        status: 500,
        data: { error: "Configure PUBLIC_GOOGLE_MAPS_API_KEY in .env" }
      })
    ).toBe("Não foi possível completar esta ação. Tente novamente.");

    expect(
      formatApiError(new Error("Stripe customer not found for cus_123"))
    ).toBe("Não foi possível completar esta ação. Tente novamente.");
  });

  it("maps known English messages to Portuguese", () => {
    expect(formatApiError({ status: 404, data: { error: "Listing not found" } })).toBe(
      "Imóvel não encontrado."
    );
    expect(
      formatApiError({ status: 400, data: { error: "Invalid JSON body" } })
    ).toBe("Não foi possível processar os dados enviados.");
  });

  it("uses action-specific fallbacks when sanitization fails", () => {
    expect(
      formatApiError(
        { status: 500, data: { error: "failed to persist listing" } },
        { action: "salvar imóvel" }
      )
    ).toBe("Não foi possível salvar o imóvel.");

    expect(
      formatApiError(
        { status: 502, data: { error: "Cannot reach Phoenix at http://localhost:4000" } },
        { action: "iniciar pagamento" }
      )
    ).toBe("Não foi possível conectar ao servidor. Tente novamente em instantes.");

    expect(
      formatApiError(new Error("Hermes attachment pipeline crashed"), {
        action: "carregar"
      })
    ).toBe("Não foi possível carregar os dados.");
  });

  it("passes through safe Portuguese messages from the API", () => {
    expect(
      formatApiError({
        status: 422,
        data: { error: "Informe título e endereço do imóvel." }
      })
    ).toBe("Informe título e endereço do imóvel.");
  });
});
