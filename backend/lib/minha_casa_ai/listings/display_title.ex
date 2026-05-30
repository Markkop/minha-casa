defmodule MinhaCasaAi.Listings.DisplayTitle do
  @moduledoc false
  # Mirrors lib/listing-display-title.ts for backend parse output.

  @street_prefix ~r/^(?:rua|r\.|av\.?|avenida|alameda|al\.?|travessa|trav\.?|rodovia|estrada|servidão|servidao|praça|praca|largo)\s+/iu

  @escalation_levels [:rua, :numero, :condominio, :preco, :m2, :andar, :id]

  def apply_to_listings(listings) when is_list(listings) do
    auto =
      listings
      |> Enum.with_index()
      |> Enum.map(fn {listing, index} ->
        id = listing["id"] || "temp-#{index}"
        Map.put(listing, "id", id)
      end)
      |> Enum.reject(&(present_manual?(&1)))

    base_locations =
      auto
      |> Map.new(fn listing ->
        {listing["id"], default_location_label(listing)}
      end)

    groups =
      Enum.group_by(auto, fn listing ->
        loc = Map.get(base_locations, listing["id"], "Sem local")
        collision_key(listing, loc)
      end)

    titles =
      Enum.reduce(groups, %{}, fn {_key, group}, acc ->
        if length(group) == 1 do
          [listing] = group
          loc = Map.get(base_locations, listing["id"], "Sem local")
          Map.put(acc, listing["id"], build_base_title(listing, loc))
        else
          assign_collision_group(group, base_locations, acc)
        end
      end)

    Enum.map(listings, fn listing ->
      cond do
        present_manual?(listing) ->
          Map.put(listing, "titulo", String.trim(listing["tituloManual"]))

        Map.has_key?(titles, listing["id"]) ->
          Map.put(listing, "titulo", Map.get(titles, listing["id"]))

        true ->
          Map.put(listing, "titulo", build_base_title(listing))
      end
    end)
  end

  defp present_manual?(listing) do
    case listing["tituloManual"] do
      v when is_binary(v) -> String.trim(v) != ""
      _ -> false
    end
  end

  defp assign_collision_group(group, base_locations, acc) do
    {assigned, used} =
      Enum.reduce(0..length(@escalation_levels), {%{}, MapSet.new()}, fn escalation, {assigned, used} ->
        Enum.reduce(group, {assigned, used}, fn listing, {assigned, used} ->
          id = listing["id"]

          if Map.has_key?(assigned, id) do
            {assigned, used}
          else
            base_loc = Map.get(base_locations, id, "Sem local")
            candidate = build_title_with_escalation(listing, base_loc, escalation)
            norm = normalize_key(candidate)

            if MapSet.member?(used, norm) do
              {assigned, used}
            else
              {
                Map.put(assigned, id, candidate),
                MapSet.put(used, norm)
              }
            end
          end
        end)
      end)

    Enum.reduce(group, acc, fn listing, acc ->
      id = listing["id"]
      base_loc = Map.get(base_locations, id, "Sem local")

      title =
        Map.get(assigned, id) ||
          build_title_with_escalation(listing, base_loc, length(@escalation_levels))

      Map.put(acc, id, title)
    end)
  end

  defp collision_key(listing, location_label) do
    tipo = listing["tipoImovel"] || ""
    quartos = listing["quartos"] || ""
    "#{tipo}|#{quartos}|#{normalize_key(location_label)}"
  end

  defp build_base_title(listing, location_label \\ nil) do
    tipo = property_type_label(listing["tipoImovel"])
    quartos = quartos_phrase(listing["quartos"])
    local = location_label || default_location_label(listing)

    if quartos do
      "#{tipo} com #{quartos} em #{local}"
    else
      "#{tipo} em #{local}"
    end
  end

  defp build_title_with_escalation(listing, base_location, escalation_index) do
    if escalation_index <= 0 do
      build_base_title(listing, base_location)
    else
      parts = [base_location]

      parts =
        Enum.reduce(0..(escalation_index - 1), parts, fn i, parts ->
          level = Enum.at(@escalation_levels, i)

          if level do
            extra = location_at_level(listing, level)

            if extra && not Enum.any?(parts, &(normalize_key(&1) == normalize_key(extra))) do
              parts ++ [extra]
            else
              parts
            end
          else
            parts
          end
        end)

      local = Enum.join(parts, " · ")
      build_base_title(listing, local)
    end
  end

  defp property_type_label("casa"), do: "Casa"
  defp property_type_label("apartamento"), do: "Apartamento"
  defp property_type_label(_), do: "Imóvel"

  defp quartos_phrase(n) when n == 1, do: "um quarto"
  defp quartos_phrase(n) when is_number(n) and n > 1, do: "#{trunc(n)} quartos"
  defp quartos_phrase(_), do: nil

  defp default_location_label(listing) do
    location_at_level(listing, :bairro) ||
      location_at_level(listing, :cidade) ||
      location_at_level(listing, :rua) ||
      "Sem local"
  end

  defp location_at_level(listing, :bairro) do
    case listing["bairro"] do
      v when is_binary(v) ->
        t = String.trim(v)
        if t != "", do: title_case_location(t), else: nil

      _ ->
        nil
    end
  end

  defp location_at_level(listing, :cidade) do
    case listing["cidade"] do
      v when is_binary(v) ->
        t = String.trim(v)
        if t != "", do: title_case_location(t), else: nil

      _ ->
        nil
    end
  end

  defp location_at_level(listing, :rua) do
    endereco = listing["endereco"] || ""
    extract_street_two_words(endereco)
  end

  defp location_at_level(listing, :numero) do
    endereco = listing["endereco"] || ""
    street = extract_street_two_words(endereco)
    number = extract_address_number(endereco)

    cond do
      street && number -> "#{street}, #{number}"
      number -> "nº #{number}"
      true -> nil
    end
  end

  defp location_at_level(listing, :condominio) do
    case listing["condominiumName"] do
      v when is_binary(v) ->
        t = String.trim(v)
        if t != "", do: title_case_location(t), else: nil

      _ ->
        nil
    end
  end

  defp location_at_level(listing, :preco), do: format_compact_price(listing["preco"])

  defp location_at_level(listing, :m2) do
    case listing["m2Totais"] do
      n when is_number(n) and n > 0 -> "#{trunc(n)} m²"
      _ -> nil
    end
  end

  defp location_at_level(listing, :andar) do
    if listing["tipoImovel"] == "apartamento" and is_number(listing["andar"]) do
      if listing["andar"] == 10, do: "andar 10+", else: "andar #{listing["andar"]}"
    else
      nil
    end
  end

  defp location_at_level(listing, :id) do
    case listing["id"] do
      id when is_binary(id) and byte_size(id) >= 4 -> String.slice(id, -4, 4)
      _ -> nil
    end
  end

  defp extract_street_two_words(endereco) when is_binary(endereco) do
    trimmed = String.trim(endereco)
    if trimmed == "", do: nil, else: do_extract_street(trimmed)
  end

  defp extract_street_two_words(_), do: nil

  defp do_extract_street(trimmed) do
    rest =
      case Regex.run(@street_prefix, trimmed, return: :index) do
        [{_, len}] -> String.slice(trimmed, len..-1//1) |> String.trim()
        _ -> trimmed
      end

    words =
      rest
      |> String.replace(~r/[,.;]/, " ")
      |> String.split(~r/\s+/, trim: true)
      |> Enum.reject(&Regex.match?(~r/^\d+$/, &1))

    case words do
      [] -> nil
      [one] -> title_case_location(one)
      [a, b | _] -> title_case_location("#{a} #{b}")
    end
  end

  defp extract_address_number(endereco) do
    case Regex.run(~r/\b(\d{1,5})\b/, endereco) do
      [_, n] -> n
      _ -> nil
    end
  end

  defp format_compact_price(preco) when is_number(preco) and preco > 0 do
    cond do
      preco >= 1_000_000 ->
        millions = preco / 1_000_000
        rounded = if millions >= 10, do: round(millions), else: Float.round(millions, 1)
        "R$ #{rounded |> to_string() |> String.replace(".", ",")} mi"

      preco >= 1_000 ->
        "R$ #{round(preco / 1_000)} mil"

      true ->
        "R$ #{trunc(preco)}"
    end
  end

  defp format_compact_price(_), do: nil

  defp title_case_location(value) do
    value
    |> String.split(~r/\s+/, trim: true)
    |> Enum.map(fn word ->
      if String.length(word) <= 3 and String.upcase(word) == word do
        word
      else
        String.capitalize(String.downcase(word))
      end
    end)
    |> Enum.join(" ")
  end

  defp normalize_key(value) do
    value |> String.trim() |> String.downcase() |> String.replace(~r/\s+/, " ")
  end
end
