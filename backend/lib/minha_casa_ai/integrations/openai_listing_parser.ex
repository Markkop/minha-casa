defmodule MinhaCasaAi.Integrations.OpenAIListingParser do
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.Langfuse.PromptHelpers
  alias MinhaCasaAi.Integrations.{OpenAIResponses, OpenAISchemas}
  alias MinhaCasaAi.Listings.ConstructionYear
  alias MinhaCasaAi.Workspace.ListingPreferences

  @max_listings 25
  @base_max_tokens 500
  @multi_max_tokens_cap 4_000

  def parse_text(raw_text, opts \\ []) when is_binary(raw_text) do
    catalog = Keyword.get(opts, :catalog, ListingPreferences.default_system_options())
    compile_vars = prompt_compile_vars(catalog)

    {instructions, prompt_ref} =
      PromptHelpers.compile("listing-parser/system", compile_vars)

    lf = PromptHelpers.langfuse_ctx("listing-parser/text", prompt_ref)

    with :ok <- require_key(),
         {:ok, map} <-
           OpenAIResponses.json(
             instructions,
             raw_text,
             reasoning_effort: "low",
             max_output_tokens: compute_max_tokens(raw_text, false),
             timeout: 45_000,
             schema: %{name: "listing_parse", schema: OpenAISchemas.listing_parse_schema(catalog)},
             langfuse: lf
           ) do
      decode_listings_map(map, catalog)
    end
  end

  def parse_image(base64, mime_type, opts \\ []) when is_binary(base64) and is_binary(mime_type) do
    catalog = Keyword.get(opts, :catalog, ListingPreferences.default_system_options())
    compile_vars = prompt_compile_vars(catalog)

    {instructions, prompt_ref} =
      PromptHelpers.compile("listing-parser/system", compile_vars)

    {vision_user, vision_ref} = PromptHelpers.compile("listing-parser/vision-user", %{})
    lf = PromptHelpers.langfuse_ctx("listing-parser/vision", prompt_ref || vision_ref)

    with :ok <- require_key(),
         :ok <- validate_image_type(mime_type),
         {:ok, map} <-
           OpenAIResponses.vision_json(
             instructions,
             data_url(base64, mime_type),
             vision_user,
             reasoning_effort: "low",
             max_output_tokens: compute_max_tokens("vision", true),
             timeout: 45_000,
             schema: %{name: "listing_parse", schema: OpenAISchemas.listing_parse_schema(catalog)},
             langfuse: lf
           ) do
      decode_listings_map(map, catalog)
    end
  end

  defp prompt_compile_vars(catalog) do
    %{
      "max_listings" => Integer.to_string(@max_listings),
      "current_year" => Integer.to_string(Date.utc_today().year),
      "preference_list" => ListingPreferences.preference_list_for_prompt(catalog)
    }
  end

  defp require_key do
    if Config.configured?(:openai), do: :ok, else: {:error, :openai_not_configured}
  end

  defp data_url(base64, mime_type) do
    cleaned = Regex.replace(~r/^data:[^;]+;base64,/, base64, "")
    "data:#{mime_type};base64,#{cleaned}"
  end

  defp decode_listings_map(%{"listings" => listings}, catalog) when is_list(listings) do
    normalized =
      listings
      |> Enum.filter(&valid_listing?/1)
      |> Enum.map(&build_listing(&1, catalog))
      |> Enum.take(@max_listings)
      |> MinhaCasaAi.Listings.DisplayTitle.apply_to_listings()

    if normalized == [], do: {:error, :invalid_ai_json}, else: {:ok, normalized}
  end

  defp decode_listings_map(listing, catalog) when is_map(listing) do
    if valid_listing?(listing) do
      [built] =
        [build_listing(listing, catalog)]
        |> MinhaCasaAi.Listings.DisplayTitle.apply_to_listings()

      {:ok, [built]}
    else
      {:error, :invalid_ai_json}
    end
  end

  defp decode_listings_map(_, _catalog), do: {:error, :invalid_ai_json}

  defp valid_listing?(listing) when is_map(listing) do
    present?(listing["endereco"]) || positive_number?(listing["preco"])
  end

  defp valid_listing?(_), do: false

  @doc false
  def build_listing(parsed, catalog) do
    preferences = normalize_parsed_preferences(parsed, catalog)
    legacy = ListingPreferences.mirror_legacy_fields(preferences, catalog)

    %{
      "titulo" => "",
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
      "preferences" => preferences,
      "piscina" => legacy["piscina"],
      "porteiro24h" => legacy["porteiro24h"],
      "academia" => legacy["academia"],
      "vistaLivre" => legacy["vistaLivre"],
      "piscinaTermica" => legacy["piscinaTermica"],
      "tipoImovel" => parsed["tipoImovel"],
      "link" => parsed["link"],
      "condominiumName" => parsed["condominiumName"],
      "contactName" => parsed["contactName"],
      "contactNumber" => parsed["contactNumber"],
      "addedAt" => Date.utc_today() |> Date.to_iso8601(),
      "sitePublishedAt" => parsed["sitePublishedAt"],
      "siteUpdatedAt" => parsed["siteUpdatedAt"],
      "anoConstrucao" => ConstructionYear.normalize(parsed["anoConstrucao"])
    }
  end

  defp normalize_parsed_preferences(parsed, catalog) do
    raw = Map.get(parsed, "preferences") || %{}

    Enum.reduce(catalog, %{}, fn option, acc ->
      value = Map.get(raw, option.key)

      normalized =
        cond do
          value in [true, false] -> value
          true -> nil
        end

      Map.put(acc, option.key, normalized)
    end)
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
