defmodule MinhaCasaAi.Listings.DisplayTitle do
  @moduledoc false
  # Mirrors lib/listing-display-title.ts for backend parse output.

  @street_prefix ~r/^(?:rua|r\.|av\.?|avenida|alameda|al\.?|travessa|trav\.?|rodovia|estrada|servidão|servidao|praça|praca|largo)\s+/iu

  @escalation_levels [:rua, :numero, :condominio, :preco, :m2, :andar, :id]
  @same_street_escalation_levels [:condominio, :preco, :m2, :andar, :id]

  def apply_to_listings(listings) when is_list(listings) do
    show_property_type_prefix = collection_shows_property_type_prefix?(listings)

    auto =
      listings
      |> Enum.with_index()
      |> Enum.map(fn {listing, index} ->
        id = listing["id"] || "temp-#{index}"
        Map.put(listing, "id", id)
      end)
      |> Enum.reject(&present_manual?(&1))

    base_locations =
      auto
      |> Map.new(fn listing ->
        {listing["id"], default_location_label(listing)}
      end)

    street_groups =
      auto
      |> Enum.group_by(&street_group_key/1)
      |> Enum.reject(fn {key, _} -> is_nil(key) end)

    {titles, same_street_ids} =
      Enum.reduce(street_groups, {%{}, MapSet.new()}, fn {_key, group}, {acc, ids} ->
        if length(group) < 2 do
          {acc, ids}
        else
          assigned =
            assign_unique_titles(
              group,
              show_property_type_prefix,
              0,
              length(@same_street_escalation_levels),
              fn listing, escalation ->
                build_same_street_title(listing, escalation, show_property_type_prefix)
              end
            )

          new_ids =
            assigned
            |> Map.keys()
            |> Enum.reduce(ids, &MapSet.put(&2, &1))

          {Map.merge(acc, assigned), new_ids}
        end
      end)

    bairro_groups =
      Enum.group_by(auto, fn listing ->
        loc = Map.get(base_locations, listing["id"], "Sem local")
        collision_key(listing, loc)
      end)

    titles =
      Enum.reduce(bairro_groups, titles, fn {_key, group}, acc ->
        cond do
          length(group) == 1 ->
            [listing] = group
            id = listing["id"]

            if Map.has_key?(acc, id) do
              acc
            else
              loc = Map.get(base_locations, id, "Sem local")

              Map.put(
                acc,
                id,
                build_base_title(listing, loc,
                  show_property_type_prefix: show_property_type_prefix
                )
              )
            end

          true ->
            pending =
              Enum.reject(group, fn listing ->
                MapSet.member?(same_street_ids, listing["id"])
              end)

            if pending == [] do
              acc
            else
              assigned =
                assign_unique_titles(
                  pending,
                  show_property_type_prefix,
                  1,
                  length(@escalation_levels),
                  fn listing, escalation ->
                    base_loc = Map.get(base_locations, listing["id"], "Sem local")

                    build_title_with_escalation(
                      listing,
                      base_loc,
                      escalation,
                      show_property_type_prefix
                    )
                  end
                )

              Map.merge(acc, assigned)
            end
        end
      end)

    titles =
      Enum.reduce(auto, titles, fn listing, acc ->
        id = listing["id"]

        if Map.has_key?(acc, id) do
          acc
        else
          loc = Map.get(base_locations, id, "Sem local")

          Map.put(
            acc,
            id,
            build_base_title(listing, loc, show_property_type_prefix: show_property_type_prefix)
          )
        end
      end)

    Enum.map(listings, fn listing ->
      cond do
        present_manual?(listing) ->
          Map.put(listing, "title", String.trim(listing["manualTitle"]))

        Map.has_key?(titles, listing["id"]) ->
          Map.put(listing, "title", Map.get(titles, listing["id"]))

        true ->
          Map.put(listing, "title", build_base_title(listing))
      end
    end)
  end

  defp present_manual?(listing) do
    case listing["manualTitle"] do
      v when is_binary(v) -> String.trim(v) != ""
      _ -> false
    end
  end

  defp collection_shows_property_type_prefix?(listings) do
    cond do
      length(listings) <= 1 ->
        true

      true ->
        has_casa = Enum.any?(listings, &(&1["propertyType"] == "house"))
        has_apto = Enum.any?(listings, &(&1["propertyType"] == "apartment"))
        has_casa and has_apto
    end
  end

  defp street_group_key(listing) do
    case location_at_level(listing, :rua) do
      nil -> nil
      street -> normalize_key(street)
    end
  end

  defp assign_unique_titles(
         group,
         _show_property_type_prefix,
         min_escalation,
         max_escalation,
         build_candidate
       ) do
    {assigned, _used} =
      Enum.reduce(min_escalation..max_escalation, {%{}, MapSet.new()}, fn escalation,
                                                                          {assigned, used} ->
        Enum.reduce(group, {assigned, used}, fn listing, {assigned, used} ->
          id = listing["id"]

          if Map.has_key?(assigned, id) do
            {assigned, used}
          else
            candidate = build_candidate.(listing, escalation)
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

    Enum.reduce(group, assigned, fn listing, assigned ->
      id = listing["id"]

      if Map.has_key?(assigned, id) do
        assigned
      else
        Map.put(assigned, id, build_candidate.(listing, max_escalation))
      end
    end)
  end

  defp build_same_street_title(listing, escalation_index, show_property_type_prefix) do
    base =
      location_at_level(listing, :numero) ||
        location_at_level(listing, :rua) ||
        default_location_label(listing)

    extras =
      0..(escalation_index - 1)
      |> Enum.take(length(@same_street_escalation_levels))
      |> Enum.reduce([], fn i, extras ->
        level = Enum.at(@same_street_escalation_levels, i)

        if level do
          extra = location_at_level(listing, level)

          if extra && not Enum.any?(extras, &(normalize_key(&1) == normalize_key(extra))) do
            extras ++ [extra]
          else
            extras
          end
        else
          extras
        end
      end)

    location_label =
      if extras == [] do
        base
      else
        Enum.join([base | extras], " · ")
      end

    build_base_title(
      listing,
      location_label,
      show_property_type_prefix: show_property_type_prefix,
      location_preposition: "na"
    )
  end

  defp collision_key(listing, location_label) do
    tipo = listing["propertyType"] || ""
    quartos = listing["bedrooms"] || ""
    "#{tipo}|#{quartos}|#{normalize_key(location_label)}"
  end

  defp build_base_title(listing, location_label \\ nil, opts \\ []) do
    show_prefix = Keyword.get(opts, :show_property_type_prefix, true)
    prep = Keyword.get(opts, :location_preposition, "em")
    tipo = property_type_label(listing["propertyType"])
    quartos = quartos_phrase(listing["bedrooms"])
    local = location_label || default_location_label(listing)
    location_part = "#{prep} #{local}"

    cond do
      quartos && show_prefix ->
        "#{tipo} com #{quartos} #{location_part}"

      quartos ->
        "#{quartos} #{location_part}"

      show_prefix ->
        "#{tipo} #{location_part}"

      true ->
        local
    end
  end

  defp build_title_with_escalation(
         listing,
         base_location,
         escalation_index,
         show_property_type_prefix
       ) do
    title_opts = [show_property_type_prefix: show_property_type_prefix]

    cond do
      escalation_index <= 0 ->
        build_base_title(
          listing,
          base_location,
          Keyword.put(title_opts, :location_preposition, "em")
        )

      location_at_level(listing, :rua) ->
        street = location_at_level(listing, :rua)

        extras =
          1..(escalation_index - 1)
          |> Enum.take(length(@escalation_levels) - 1)
          |> Enum.reduce([], fn i, extras ->
            level = Enum.at(@escalation_levels, i)

            if level do
              extra = location_at_level(listing, level)

              if extra && not Enum.any?(extras, &(normalize_key(&1) == normalize_key(extra))) do
                extras ++ [extra]
              else
                extras
              end
            else
              extras
            end
          end)

        street_part =
          if extras == [], do: street, else: Enum.join([street | extras], ", ")

        location_label = "#{street_part} em #{base_location}"

        build_base_title(
          listing,
          location_label,
          Keyword.put(title_opts, :location_preposition, "na")
        )

      true ->
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
        build_base_title(listing, local, Keyword.put(title_opts, :location_preposition, "em"))
    end
  end

  defp property_type_label("house"), do: "Casa"
  defp property_type_label("apartment"), do: "Apartamento"
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
    case listing["neighborhood"] do
      v when is_binary(v) ->
        t = String.trim(v)
        if t != "", do: title_case_location(t), else: nil

      _ ->
        nil
    end
  end

  defp location_at_level(listing, :cidade) do
    case listing["city"] do
      v when is_binary(v) ->
        t = String.trim(v)
        if t != "", do: title_case_location(t), else: nil

      _ ->
        nil
    end
  end

  defp location_at_level(listing, :rua) do
    endereco = listing["address"] || ""
    extract_street_two_words(endereco)
  end

  defp location_at_level(listing, :numero) do
    endereco = listing["address"] || ""
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

  defp location_at_level(listing, :preco), do: format_compact_price(listing["price"])

  defp location_at_level(listing, :m2) do
    case listing["totalAreaM2"] do
      n when is_number(n) and n > 0 -> "#{trunc(n)} m²"
      _ -> nil
    end
  end

  defp location_at_level(listing, :andar) do
    if listing["propertyType"] == "apartment" and is_number(listing["floor"]) do
      if listing["floor"] == 10, do: "andar 10+", else: "andar #{listing["floor"]}"
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
