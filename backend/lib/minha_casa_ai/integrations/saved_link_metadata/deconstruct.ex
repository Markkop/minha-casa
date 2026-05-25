defmodule MinhaCasaAi.Integrations.SavedLinkMetadata.Deconstruct do
  @moduledoc false

  @ordem_labels %{
    "LOWEST_PRICE" => "menor preço",
    "HIGHEST_PRICE" => "maior preço",
    "MOST_RECENT" => "mais recentes",
    "RELEVANCE" => "relevância"
  }

  @city_slug_labels %{
    "florianopolis" => "Florianópolis",
    "sao-paulo" => "São Paulo",
    "rio-de-janeiro" => "Rio de Janeiro",
    "santa-catarina" => "Santa Catarina"
  }

  def deconstruct_url(raw_url) when is_binary(raw_url) do
    uri = URI.parse(String.trim(raw_url))
    path_segments = uri.path |> String.split("/", trim: true)
    query_params = URI.decode_query(uri.query || "")

    host_parts =
      (uri.host || "")
      |> String.replace_prefix("www.", "")
      |> String.split(".")
      |> Enum.reject(&(&1 in ["br", "com", "org", "gov", "edu", "net"]))

    site_label = site_label_from_host(host_parts)
    listing_type = listing_type_from(path_segments, query_params)
    region_path = region_path_from(path_segments)

    neighborhood =
      neighborhood_from_path(path_segments) || neighborhood_from_query(query_params)

    city =
      viewport_city(query_params["viewport"]) ||
        city_from_path(path_segments) ||
        slug_city(region_path)

    quartos = quartos_from(query_params["quartos"])
    ordem = ordem_from(query_params["ordem"])
    map_region = viewport_city(query_params["viewport"])
    price_range = price_range_from(query_params)

    hints = %{
      site_label: site_label,
      listing_type: listing_type,
      region_path: region_path,
      neighborhood: neighborhood,
      city: city,
      location_label: nil,
      quartos: quartos,
      ordem: ordem,
      map_region: map_region,
      price_range: price_range
    }

    hints = Map.put(hints, :location_label, build_location_label(hints))

    %{
      hostname: uri.host || "",
      pathname: uri.path || "",
      path_segments: path_segments,
      query_params: query_params,
      hints: hints
    }
  end

  def build_brave_query(%{hints: hints, path_segments: path_segments, hostname: hostname}) do
    words =
      []
      |> maybe_word(hints.site_label)
      |> maybe_word(hints.listing_type)
      |> maybe_word(if "venda" in path_segments or "comprar" in path_segments, do: "venda", else: nil)
      |> maybe_word(hints.neighborhood)
      |> maybe_word(hints.map_region || hints.city)
      |> maybe_word(
        if hints.region_path && hints.region_path != "brasil",
          do: String.replace(hints.region_path, "-", " "),
          else: nil
      )
      |> maybe_word(if String.contains?(hostname, "pmf"), do: "prefeitura florianópolis", else: nil)
      |> maybe_word(hints.quartos)
      |> maybe_word(hints.ordem)
      |> maybe_word(if "map" in path_segments, do: "mapa", else: nil)
      |> Enum.uniq()
      |> Enum.reject(&is_nil/1)
      |> Enum.take(12)

    case words do
      [] -> String.replace_prefix(hostname, "www.", "")
      list -> Enum.join(list, " ")
    end
  end

  def build_location_label(hints) do
    city =
      hints.city ||
        hints.map_region ||
        if hints.region_path && hints.region_path != "brasil",
          do: slug_city(hints.region_path),
          else: nil

    neighborhood =
      if hints.neighborhood, do: capitalize_location(hints.neighborhood), else: nil

    cond do
      neighborhood && city -> "#{neighborhood}, #{city}"
      neighborhood -> neighborhood
      true -> city
    end
  end

  def region_hint_from_viewport(viewport) when is_binary(viewport) do
    case parse_viewport_center(viewport) do
      {lat, lng} ->
        cond do
          lat >= -27.85 and lat <= -26.95 and lng >= -49.0 and lng <= -48.2 ->
            "Florianópolis"

          lat >= -27.1 and lat <= -26.7 and lng >= -48.9 and lng <= -48.4 ->
            "Grande Florianópolis"

          lat >= -23.8 and lat <= -23.2 and lng >= -46.8 and lng <= -46.2 ->
            "São Paulo"

          lat >= -23.1 and lat <= -22.7 and lng >= -43.4 and lng <= -42.9 ->
            "Rio de Janeiro"

          true ->
            nil
        end

      _ ->
        nil
    end
  end

  def region_hint_from_viewport(_), do: nil

  def description_from_hints(%{hints: hints}) do
    if hints.listing_type || hints.quartos || hints.price_range || hints.ordem || hints.location_label do
      desc = "Busca de #{hints.listing_type || "imóveis"}"
      desc = if hints.quartos, do: desc <> " com #{hints.quartos}", else: desc
      desc = if hints.location_label, do: desc <> " em #{hints.location_label}", else: desc

      desc =
        if hints.price_range do
          if String.starts_with?(hints.price_range, ["até", "a partir"]),
            do: desc <> " #{hints.price_range}",
            else: desc <> ", #{hints.price_range}"
        else
          desc
        end

      if hints.ordem, do: desc <> ", #{hints.ordem}", else: desc
    else
      nil
    end
  end

  defp site_label_from_host(["pmf" | _]), do: "geoportal pmf"
  defp site_label_from_host(["vivareal" | _]), do: "vivareal"
  defp site_label_from_host(["dagaimoveis" | _]), do: "daga imoveis"
  defp site_label_from_host([first | _]), do: first
  defp site_label_from_host(_), do: nil

  defp listing_type_from(path_segments, query_params) do
    tipos = Map.get(query_params, "tipos", "")

    cond do
      Enum.any?(path_segments, &String.contains?(&1, "apartamento")) ||
          String.contains?(tipos, "apartamento") ->
        "apartamentos"

      Enum.any?(path_segments, &String.contains?(&1, "casa")) ||
          String.contains?(tipos, "casa") ||
          String.contains?(Map.get(query_params, "by_type_or_subtype_slug[0]", ""), "casa") ->
        "casas"

      true ->
        nil
    end
  end

  defp region_path_from(path_segments) do
    Enum.find_value(path_segments, fn seg ->
      base = seg |> String.split("+") |> hd() |> String.trim()

      if base in ["brasil", "florianopolis", "sao-paulo", "rio-de-janeiro", "santa-catarina"],
        do: base,
        else: nil
    end)
  end

  defp neighborhood_from_query(params) do
    Enum.find_value(["bairro", "neighborhood", "neighborhoods", "localizacao", "onde"], fn key ->
      case Map.get(params, key) do
        val when is_binary(val) ->
          val
          |> URI.decode()
          |> String.split(",")
          |> hd()
          |> String.trim()
          |> case do
            clean when byte_size(clean) > 2 -> String.downcase(clean)
            _ -> nil
          end

        _ ->
          nil
      end
    end)
  end

  defp neighborhood_from_path(path_segments) do
    Enum.find_value(path_segments, fn seg ->
      parts = String.split(seg, "+", trim: true)

      if length(parts) >= 2 do
        last = parts |> List.last() |> String.replace(~r/-sc$/i, "")
        chunks = String.split(last, "-", trim: true)

        cond do
          length(chunks) >= 2 ->
            neighborhood = List.last(chunks)
            if byte_size(neighborhood) > 2, do: neighborhood, else: nil

          true ->
            name = String.replace(last, "-", " ") |> String.trim()
            if byte_size(name) > 2, do: name, else: nil
        end
      else
        nil
      end
    end)
  end

  defp city_from_path(path_segments) do
    Enum.find_value(path_segments, fn seg ->
      Enum.find_value(String.split(seg, "+"), fn part ->
        slug_city(part)
      end)
    end)
  end

  defp slug_city(slug) when is_binary(slug) do
    key =
      slug
      |> String.downcase()
      |> String.split("-")
      |> Enum.find(fn part ->
        Map.has_key?(@city_slug_labels, part) || String.contains?(part, "florianopolis")
      end)

    cond do
      key && Map.has_key?(@city_slug_labels, key) -> Map.get(@city_slug_labels, key)
      key && String.contains?(key, "florianopolis") -> "Florianópolis"
      key && String.contains?(key, "sao-paulo") -> "São Paulo"
      key && String.contains?(key, "rio-de-janeiro") -> "Rio de Janeiro"
      String.contains?(slug, "florianopolis") -> "Florianópolis"
      true -> nil
    end
  end

  defp slug_city(_), do: nil

  defp viewport_city(nil), do: nil
  defp viewport_city(viewport), do: region_hint_from_viewport(viewport)

  defp quartos_from(nil), do: nil

  defp quartos_from(quartos) when is_binary(quartos) do
    q = String.replace(quartos, ",", "-")
    "#{q} quartos"
  end

  defp ordem_from(nil), do: nil

  defp ordem_from(ordem) when is_binary(ordem) do
    Map.get(@ordem_labels, String.upcase(ordem), String.downcase(ordem))
  end

  defp price_range_from(params) do
    min_raw = params["minValue"] || params["precoMinimo"] || params["preco_minimo"]
    max_raw = params["maxValue"] || params["precoMaximo"] || params["preco_maximo"]
    min = parse_money(min_raw)
    max = parse_money(max_raw)

    cond do
      min && max -> "#{format_price(min)}–#{format_price(max)}"
      max -> "até #{format_price(max)}"
      min -> "a partir de #{format_price(min)}"
      true -> nil
    end
  end

  defp parse_money(nil), do: nil

  defp parse_money(value) when is_binary(value) do
    digits = Regex.replace(~r/[^\d]/, value, "")

    case Integer.parse(digits) do
      {n, _} -> n
      :error -> nil
    end
  end

  defp format_price(value) when value >= 1_000_000 do
    m = value / 1_000_000

    if rem(value, 1_000_000) == 0,
      do: "R$#{trunc(m)}M",
      else: "R$#{m |> Float.round(1) |> to_string()}M"
  end

  defp format_price(value) when value >= 1_000 do
    k = value / 1_000
    if rem(value, 1_000) == 0, do: "R$#{trunc(k)}k", else: "R$#{round(k)}k"
  end

  defp format_price(value), do: "R$#{value}"

  defp parse_viewport_center(viewport) do
    parts =
      viewport
      |> String.split("|")
      |> Enum.map(fn part ->
        part
        |> String.split(",")
        |> Enum.map(&parse_float/1)
      end)

    case parts do
      [[lng1, lat1] | _] when is_number(lng1) and is_number(lat1) ->
        case parts do
          [[_, _], [lng2, lat2] | _] when is_number(lng2) and is_number(lat2) ->
            {(lat1 + lat2) / 2, (lng1 + lng2) / 2}

          _ ->
            {lat1, lng1}
        end

      _ ->
        nil
    end
  end

  defp parse_float(str) do
    case Float.parse(str) do
      {n, _} -> n
      :error -> nil
    end
  end

  defp capitalize_location(name) when is_binary(name) do
    name
    |> String.split(~r/[\s-]+/, trim: true)
    |> Enum.map(fn word ->
      if word == "", do: "", else: String.upcase(String.first(word)) <> String.slice(word, 1..-1//1)
    end)
    |> Enum.join(" ")
  end

  defp maybe_word(list, nil), do: list
  defp maybe_word(list, ""), do: list
  defp maybe_word(list, word), do: list ++ [word]
end
