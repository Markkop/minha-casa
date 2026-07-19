defmodule MinhaCasaAiWeb.PublicErrorTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAiWeb.PublicError

  describe "message_for/2" do
    test "maps known English strings to Portuguese" do
      assert PublicError.message_for("Listing not found") == "Imóvel não encontrado."
      assert PublicError.message_for("Unauthorized") == "Sessão expirada. Faça login novamente."
    end

    test "maps atoms to Portuguese" do
      assert PublicError.message_for(:listing_not_found) == "Imóvel não encontrado."
      assert PublicError.message_for(:workspace_frozen) == "Seu perfil está em modo somente leitura."
    end

    test "rejects technical inspect output" do
      assert PublicError.message_for(":quota_exceeded") == PublicError.generic()
      assert PublicError.message_for("Failed to enqueue image ingestion: :oban_unavailable") ==
               PublicError.generic()
    end

    test "rejects stripe and openai leaks" do
      assert PublicError.message_for("Stripe request failed with status 400") ==
               PublicError.generic()

      assert PublicError.message_for("OpenAI API key not configured on server") ==
               PublicError.generic()
    end

    test "changeset returns generic validation message" do
      changeset =
        {%{}, %{name: :string}}
        |> Ecto.Changeset.change()
        |> Ecto.Changeset.validate_required([:name])

      assert PublicError.changeset_message(changeset) ==
               "Verifique os dados informados e tente novamente."
    end
  end

  describe "sanitize/1 and public_failure_message/1" do
    test "returns nil for technical stored errors" do
      assert PublicError.sanitize("Hermes não configurado (HERMES_API_URL / HERMES_API_KEY).") ==
               nil

      assert PublicError.sanitize("HTTP 401: unauthorized") == nil
    end

    test "public_failure_message replaces technical text" do
      assert PublicError.public_failure_message("HTTP 500: boom") ==
               PublicError.analysis_failure()
    end

    test "keeps safe Portuguese messages" do
      message = "Análise completa em andamento; aguarde ou atualize a página."
      assert PublicError.sanitize(message) == message
    end
  end

  describe "sanitize_listing_details/1" do
    test "maps field reasons without internal field names" do
      details = [%{field: "propertyType", reason: "is not a supported value"}]

      assert [%{field: "tipo de imóvel", reason: "Valor não suportado."}] =
               PublicError.sanitize_listing_details(details)
    end
  end

  describe "build_payload/2" do
    test "includes stable codes for quota errors" do
      assert %{error: message, code: "workspace_frozen"} =
               PublicError.build_payload(:workspace_frozen)

      assert message =~ "somente leitura"
    end

    test "never includes inspect in payload" do
      payload = PublicError.build_payload({:error, :quota_exceeded})
      refute payload.error =~ "inspect"
      refute payload.error =~ ":quota_exceeded"
    end
  end
end
