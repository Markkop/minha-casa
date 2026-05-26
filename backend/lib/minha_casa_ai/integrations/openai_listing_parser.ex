defmodule MinhaCasaAi.Integrations.OpenAIListingParser do
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.OpenAIResponses

  @max_listings 25
  @base_max_tokens 500
  @multi_max_tokens_cap 4_000

  @system_prompt """
  Você é um especialista em extrair dados estruturados de anúncios de imóveis brasileiros.

  Extraia: titulo, endereco, bairro, cidade, m2Totais, m2Privado, quartos, suites, banheiros,
  garagem, preco, piscina, porteiro24h, academia, vistaLivre, piscinaTermica, tipoImovel,
  condominiumName, contactName, contactNumber, sitePublishedAt e siteUpdatedAt.

  Regras:
  - Retorne SEMPRE um JSON válido e nada além do JSON.
  - Use null para campos não encontrados.
  - Para números, retorne apenas o valor numérico.
  - tipoImovel deve ser "casa", "apartamento" ou null.
  - Normalize contactNumber com apenas dígitos e remova prefixo 55 quando existir.
  - Datas devem ser YYYY-MM-DD quando explícitas.
  - Se houver vários imóveis distintos, retorne {"listings": [...]}.
  - Se houver apenas um imóvel, retorne o objeto plano.
  - Não duplique o mesmo imóvel. Limite máximo de #{@max_listings} imóveis.
  """

  @vision_prompt "Extraia todos os dados dos anúncios de imóveis visíveis nesta imagem. Se houver vários imóveis distintos, use o formato com array listings. Retorne apenas JSON."

  def parse_text(raw_text) when is_binary(raw_text) do
    with :ok <- require_key(),
         {:ok, map} <-
           OpenAIResponses.json(
             @system_prompt,
             raw_text,
             reasoning_effort: "low",
             max_output_tokens: compute_max_tokens(raw_text, false),
             timeout: 45_000
           ) do
      decode_listings_map(map)
    end
  end

  def parse_image(base64, mime_type) when is_binary(base64) and is_binary(mime_type) do
    with :ok <- require_key(),
         :ok <- validate_image_type(mime_type),
         {:ok, map} <-
           OpenAIResponses.vision_json(
             @system_prompt,
             data_url(base64, mime_type),
             @vision_prompt,
             reasoning_effort: "low",
             max_output_tokens: compute_max_tokens("vision", true),
             timeout: 45_000
           ) do
      decode_listings_map(map)
    end
  end

  defp require_key do
    if Config.configured?(:openai), do: :ok, else: {:error, :openai_not_configured}
  end

  defp data_url(base64, mime_type) do
    cleaned = Regex.replace(~r/^data:[^;]+;base64,/, base64, "")
    "data:#{mime_type};base64,#{cleaned}"
  end

  defp decode_listings_map(%{"listings" => listings}) when is_list(listings) do
    normalized =
      listings
      |> Enum.filter(&valid_listing?/1)
      |> Enum.map(&build_listing/1)
      |> Enum.take(@max_listings)

    if normalized == [], do: {:error, :invalid_ai_json}, else: {:ok, normalized}
  end

  defp decode_listings_map(listing) when is_map(listing) do
    if valid_listing?(listing),
      do: {:ok, [build_listing(listing)]},
      else: {:error, :invalid_ai_json}
  end

  defp decode_listings_map(_), do: {:error, :invalid_ai_json}

  defp valid_listing?(listing) when is_map(listing) do
    present?(listing["titulo"]) || present?(listing["endereco"]) ||
      positive_number?(listing["preco"])
  end

  defp valid_listing?(_), do: false

  defp build_listing(parsed) do
    %{
      "titulo" => parsed["titulo"] || "Sem título",
      "endereco" => parsed["endereco"] || "Endereço não informado",
      "bairro" => parsed["bairro"],
      "cidade" => parsed["cidade"],
      "m2Totais" => parsed["m2Totais"],
      "m2Privado" => parsed["m2Privado"],
      "quartos" => parsed["quartos"],
      "suites" => parsed["suites"],
      "banheiros" => parsed["banheiros"],
      "garagem" => parsed["garagem"],
      "preco" => parsed["preco"],
      "precoM2" => nil,
      "piscina" => parsed["piscina"],
      "porteiro24h" => parsed["porteiro24h"],
      "academia" => parsed["academia"],
      "vistaLivre" => parsed["vistaLivre"],
      "piscinaTermica" => parsed["piscinaTermica"],
      "tipoImovel" => parsed["tipoImovel"],
      "link" => parsed["link"],
      "condominiumName" => parsed["condominiumName"],
      "contactName" => parsed["contactName"],
      "contactNumber" => parsed["contactNumber"],
      "addedAt" => Date.utc_today() |> Date.to_iso8601(),
      "sitePublishedAt" => parsed["sitePublishedAt"],
      "siteUpdatedAt" => parsed["siteUpdatedAt"]
    }
  end

  defp compute_max_tokens(input, true), do: compute_max_tokens(input, false) + 300

  defp compute_max_tokens(input, false) do
    length = String.length(input)

    if length < 800 do
      @base_max_tokens
    else
      estimated = min(@max_listings, max(2, ceil(length / 600)))
      min(@multi_max_tokens_cap, 400 + estimated * 350)
    end
  end

  defp validate_image_type(type) when type in ["image/jpeg", "image/png", "image/webp"], do: :ok
  defp validate_image_type(_), do: {:error, :unsupported_image_type}

  defp present?(value), do: is_binary(value) && String.trim(value) != ""
  defp positive_number?(value) when is_number(value), do: value > 0
  defp positive_number?(_), do: false
end
