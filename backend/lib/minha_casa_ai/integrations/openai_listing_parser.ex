defmodule MinhaCasaAi.Integrations.OpenAIListingParser do
  alias MinhaCasaAi.Config

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
    with {:ok, api_key} <- require_key(),
         {:ok, content} <-
           chat_completion(
             api_key,
             "gpt-4o-mini",
             text_messages(raw_text),
             compute_max_tokens(raw_text, false)
           ) do
      decode_listings(content)
    end
  end

  def parse_image(base64, mime_type) when is_binary(base64) and is_binary(mime_type) do
    with {:ok, api_key} <- require_key(),
         :ok <- validate_image_type(mime_type),
         {:ok, content} <-
           chat_completion(
             api_key,
             "gpt-4o",
             image_messages(base64, mime_type),
             compute_max_tokens("vision", true)
           ) do
      decode_listings(content)
    end
  end

  defp require_key do
    if Config.configured?(:openai) do
      {:ok, Config.openai_api_key()}
    else
      {:error, :openai_not_configured}
    end
  end

  defp text_messages(raw_text) do
    [
      %{role: "system", content: @system_prompt},
      %{role: "user", content: raw_text}
    ]
  end

  defp image_messages(base64, mime_type) do
    cleaned = Regex.replace(~r/^data:[^;]+;base64,/, base64, "")
    data_url = "data:#{mime_type};base64,#{cleaned}"

    [
      %{role: "system", content: @system_prompt},
      %{
        role: "user",
        content: [
          %{type: "text", text: @vision_prompt},
          %{type: "image_url", image_url: %{url: data_url}}
        ]
      }
    ]
  end

  defp chat_completion(api_key, model, messages, max_tokens) do
    body = %{
      model: model,
      messages: messages,
      temperature: 0.1,
      max_tokens: max_tokens,
      response_format: %{type: "json_object"}
    }

    url = "https://api.openai.com/v1/chat/completions"
    headers = [{"content-type", "application/json"}, {"authorization", "Bearer #{api_key}"}]
    encoded = Jason.encode!(body)

    case :hackney.post(url, headers, encoded, recv_timeout: 45_000, pool: :default) do
      {:ok, status, _resp_headers, body} when status in 200..299 and is_binary(body) ->
        with {:ok, %{"choices" => [%{"message" => %{"content" => content}} | _]}} <-
               Jason.decode(body),
             true <- is_binary(content) do
          {:ok, content}
        else
          _ -> {:error, :empty_ai_response}
        end

      {:ok, 401, _, _} ->
        {:error, :openai_unauthorized}

      {:ok, 429, _, _} ->
        {:error, :openai_rate_limited}

      {:ok, status, _, _} when status >= 500 ->
        {:error, :openai_unavailable}

      {:ok, _, _, _} ->
        {:error, :empty_ai_response}

      {:error, _reason} ->
        {:error, :openai_network_error}
    end
  end

  defp decode_listings(content) do
    case Jason.decode(content) do
      {:ok, %{"listings" => listings}} when is_list(listings) ->
        normalized =
          listings
          |> Enum.filter(&valid_listing?/1)
          |> Enum.map(&build_listing/1)
          |> Enum.take(@max_listings)

        if normalized == [], do: {:error, :invalid_ai_json}, else: {:ok, normalized}

      {:ok, listing} when is_map(listing) ->
        if valid_listing?(listing),
          do: {:ok, [build_listing(listing)]},
          else: {:error, :invalid_ai_json}

      _ ->
        {:error, :invalid_ai_json}
    end
  end

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
