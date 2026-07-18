defmodule MinhaCasaAi.Listings.ListingData do
  @moduledoc """
  Canonical ListingData v2 contract.

  The persisted and emitted representation uses English keys. Legacy keys are
  accepted at ingress so older clients, pending bot actions and merge sessions
  can cross the migration boundary without being dual-written.
  """

  alias MinhaCasaAi.Listings.ConstructionYear

  @field_sources %{
    "title" => ["title", "titulo"],
    "manualTitle" => ["manualTitle", "tituloManual"],
    "address" => ["address", "endereco"],
    "neighborhood" => ["neighborhood", "bairro"],
    "city" => ["city", "cidade"],
    "totalAreaM2" => ["totalAreaM2", "m2Totais"],
    "privateAreaM2" => ["privateAreaM2", "m2Privado"],
    "bedrooms" => ["bedrooms", "quartos"],
    "suites" => ["suites"],
    "bathrooms" => ["bathrooms", "banheiros"],
    "parkingSpots" => ["parkingSpots", "garagem"],
    "constructionYear" => ["constructionYear", "anoConstrucao"],
    "price" => ["price", "preco", "precoVenda", "valor"],
    "pricePerM2" => ["pricePerM2", "precoM2"],
    "floor" => ["floor", "andar"],
    "propertyType" => ["propertyType", "tipoImovel"],
    "stage" => ["stage", "listingEtapa", "listingStatus", "etapa"],
    "sourceUrl" => ["sourceUrl", "link"],
    "notes" => ["notes", "observacoes"],
    "contactName" => ["contactName", "corretor"],
    "contactNumber" => ["contactNumber", "telefone"],
    "condominiumName" => ["condominiumName", "condominioNome"],
    "coverImageIndex" => ["coverImageIndex", "imageCoverIndex"],
    "imageUrl" => ["imageUrl", "coverImageUrl"]
  }

  @legacy_top_level_keys (@field_sources
                          |> Map.values()
                          |> List.flatten()
                          |> Enum.reject(&Map.has_key?(@field_sources, &1))) ++
                           ~w(preferences piscina porteiro24h academia vistaLivre piscinaTermica idade imageCategories)

  @canonical_fields ~w(
    title manualTitle address neighborhood city totalAreaM2 privateAreaM2 bedrooms suites
    bathrooms parkingSpots constructionYear price pricePerM2 floor propertyType stage sourceUrl
    notes contactName contactNumber condominiumName condominiumId regionId coverImageIndex imageUrl
    imageUrls imageStorageKeys imageFingerprints imageEnvironments imageIngestionStatus
    imageIngestionError starred visited strikethrough discardedReason addedAt sitePublishedAt
    siteUpdatedAt customLat customLng features
  )

  @property_types %{
    "casa" => "house",
    "apartamento" => "apartment",
    "house" => "house",
    "apartment" => "apartment"
  }

  @stages %{
    "analisando" => "analyzing",
    "considerando" => "considering",
    "marcando_visita" => "scheduling_visit",
    "visita_marcada" => "visit_scheduled",
    "visitando" => "visiting",
    "visitado" => "visited",
    "negociando" => "negotiating",
    "proposta_enviada" => "offer_submitted",
    "em_espera" => "on_hold",
    "descartando" => "discarding",
    "descartado" => "discarded",
    "vendido" => "sold",
    "analyzing" => "analyzing",
    "considering" => "considering",
    "scheduling_visit" => "scheduling_visit",
    "visit_scheduled" => "visit_scheduled",
    "visiting" => "visiting",
    "visited" => "visited",
    "negotiating" => "negotiating",
    "offer_submitted" => "offer_submitted",
    "on_hold" => "on_hold",
    "discarding" => "discarding",
    "discarded" => "discarded",
    "sold" => "sold"
  }

  @feature_keys %{
    "piscina" => "pool",
    "pool" => "pool",
    "academia" => "gym",
    "gym" => "gym",
    "portaria" => "doorman24h",
    "porteiro24h" => "doorman24h",
    "doorman24h" => "doorman24h",
    "vista_livre" => "unobstructedView",
    "vistaLivre" => "unobstructedView",
    "unobstructedView" => "unobstructedView",
    "piscina_termica" => "heatedPool",
    "piscinaTermica" => "heatedPool",
    "heatedPool" => "heatedPool",
    "esquina" => "cornerLot",
    "cornerLot" => "cornerLot",
    "cobertura" => "penthouse",
    "penthouse" => "penthouse",
    "jardim" => "garden",
    "garden" => "garden",
    "terrea" => "singleStory",
    "singleStory" => "singleStory"
  }

  @feature_mirrors %{
    "piscina" => "pool",
    "academia" => "gym",
    "porteiro24h" => "doorman24h",
    "vistaLivre" => "unobstructedView",
    "piscinaTermica" => "heatedPool"
  }

  @image_space_kinds %{
    "areaExterna" => "exterior",
    "sala" => "livingRoom",
    "cozinha" => "kitchen",
    "quarto" => "bedroom",
    "banheiro" => "bathroom",
    "garagem" => "garage",
    "varanda" => "balcony",
    "areaServico" => "utilityRoom"
  }

  @doc "Normalizes a complete stored or incoming listing map to ListingData v2."
  def normalize(data) when is_map(data), do: do_normalize(data, true)
  def normalize(_), do: %{}

  @doc "Normalizes only fields present in a partial update."
  def normalize_patch(data) when is_map(data), do: do_normalize(data, false)
  def normalize_patch(_), do: %{}

  @doc "Deep-merges a canonicalized partial update into canonical stored data."
  def merge(current, patch) when is_map(current) and is_map(patch) do
    current = normalize(current)
    patch = normalize_patch(patch)

    Map.merge(current, patch, fn
      "features", left, right when is_map(left) and is_map(right) -> Map.merge(left, right)
      _key, _left, right -> right
    end)
  end

  @doc "Validates and normalizes ListingData v2, accepting only known legacy aliases."
  def validate(data) when is_map(data) do
    input_errors =
      []
      |> validate_input_keys(data)
      |> validate_input_features(data)

    data = normalize(data)

    errors =
      input_errors
      |> validate_enum(data, "propertyType", Map.values(@property_types) |> Enum.uniq())
      |> validate_enum(data, "stage", Map.values(@stages) |> Enum.uniq())
      |> validate_features(data)

    if errors == [] do
      {:ok, data}
    else
      {:error, errors |> Enum.reverse() |> Enum.uniq()}
    end
  end

  def validate(_), do: {:error, [%{field: "data", reason: "must be an object"}]}

  def property_types, do: @property_types |> Map.values() |> Enum.uniq()
  def stages, do: @stages |> Map.values() |> Enum.uniq()

  def canonical_path(path) when is_binary(path) do
    case String.split(path, ".", parts: 2) do
      ["preferences", feature] -> "features.#{canonical_feature_key(feature)}"
      ["features", feature] -> "features.#{canonical_feature_key(feature)}"
      [first, rest] -> "#{canonical_key(first)}.#{rest}"
      [first] -> canonical_key(first)
    end
  end

  def canonical_path(path), do: path

  defp do_normalize(data, derive_stage?) do
    base = Map.take(data, @canonical_fields)

    normalized =
      Enum.reduce(@field_sources, base, fn {target, sources}, acc ->
        case fetch_first(data, sources) do
          {:ok, value} -> Map.put(acc, target, normalize_field(target, value))
          :error -> acc
        end
      end)
      |> normalize_features(data)
      |> normalize_image_spaces()

    if derive_stage? and not Map.has_key?(normalized, "stage") do
      cond do
        data["strikethrough"] == true -> Map.put(normalized, "stage", "discarded")
        data["visited"] == true -> Map.put(normalized, "stage", "visited")
        true -> normalized
      end
    else
      normalized
    end
  end

  defp normalize_features(base, source) do
    legacy = normalize_feature_map(source["preferences"])
    canonical = normalize_feature_map(source["features"])
    features = Map.merge(legacy, canonical)

    features =
      Enum.reduce(@feature_mirrors, features, fn {legacy_key, canonical_key}, acc ->
        if Map.has_key?(acc, canonical_key) or not Map.has_key?(source, legacy_key) do
          acc
        else
          Map.put(acc, canonical_key, normalize_feature_value(source[legacy_key]))
        end
      end)

    cond do
      features != %{} ->
        Map.put(base, "features", features)

      Map.has_key?(source, "features") or Map.has_key?(source, "preferences") ->
        Map.put(base, "features", %{})

      true ->
        base
    end
  end

  defp normalize_feature_map(value) when is_map(value) do
    Enum.reduce(value, %{}, fn {key, feature_value}, acc ->
      Map.put(acc, canonical_feature_key(to_string(key)), normalize_feature_value(feature_value))
    end)
  end

  defp normalize_feature_map(_), do: %{}
  defp normalize_feature_value(value) when value in [true, false, nil], do: value
  defp normalize_feature_value(value), do: value

  defp canonical_feature_key(key), do: Map.get(@feature_keys, key, key)

  defp canonical_key(key) do
    Enum.find_value(@field_sources, key, fn {target, sources} ->
      if key in sources, do: target
    end)
  end

  defp normalize_field("constructionYear", value), do: ConstructionYear.normalize(value)
  defp normalize_field("propertyType", value), do: Map.get(@property_types, value, value)
  defp normalize_field("stage", value), do: Map.get(@stages, value, value)
  defp normalize_field(_key, value), do: value

  defp normalize_image_spaces(%{"imageEnvironments" => spaces} = data) when is_list(spaces) do
    normalized =
      Enum.map(spaces, fn
        %{"kind" => kind} = space ->
          Map.put(space, "kind", Map.get(@image_space_kinds, kind, kind))

        space ->
          space
      end)

    Map.put(data, "imageEnvironments", normalized)
  end

  defp normalize_image_spaces(data), do: data

  defp fetch_first(data, keys) do
    Enum.find_value(keys, :error, fn key ->
      if Map.has_key?(data, key), do: {:ok, Map.get(data, key)}
    end)
  end

  defp validate_enum(errors, data, key, allowed) do
    value = data[key]

    if is_nil(value) or value in allowed do
      errors
    else
      [%{field: key, reason: "is not a supported value"} | errors]
    end
  end

  defp validate_input_keys(errors, data) do
    supported = MapSet.new(@canonical_fields ++ @legacy_top_level_keys)

    data
    |> Map.keys()
    |> Enum.reject(&MapSet.member?(supported, &1))
    |> Enum.sort_by(&to_string/1)
    |> Enum.reduce(errors, fn key, acc ->
      [%{field: to_string(key), reason: "is not supported by ListingData v2"} | acc]
    end)
  end

  defp validate_input_features(errors, data) do
    errors
    |> validate_input_feature_map(data, "features")
    |> validate_input_feature_map(data, "preferences")
  end

  defp validate_input_feature_map(errors, data, key) do
    case Map.fetch(data, key) do
      :error ->
        errors

      {:ok, value} when is_map(value) ->
        if Enum.all?(value, fn {_feature, enabled} -> enabled in [true, false, nil] end) do
          errors
        else
          [%{field: key, reason: "values must be boolean or null"} | errors]
        end

      {:ok, _value} ->
        [%{field: key, reason: "must be an object"} | errors]
    end
  end

  defp validate_features(errors, %{"features" => features}) when is_map(features) do
    if Enum.all?(features, fn {_key, value} -> value in [true, false, nil] end) do
      errors
    else
      [%{field: "features", reason: "values must be boolean or null"} | errors]
    end
  end

  defp validate_features(errors, %{"features" => _}),
    do: [%{field: "features", reason: "must be an object"} | errors]

  defp validate_features(errors, _data), do: errors
end
