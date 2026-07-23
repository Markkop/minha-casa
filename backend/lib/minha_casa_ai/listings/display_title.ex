defmodule MinhaCasaAi.Listings.DisplayTitle do
  @moduledoc false
  # Mirrors lib/listing-display-title.ts for backend parse output.

  @street_prefix ~r/^(?:rua|r\.|av\.?|avenida|alameda|al\.?|travessa|trav\.?|rodovia|estrada|servidão|servidao|praça|praca|largo)\s+/iu

  def apply_to_listings(listings) when is_list(listings) do
    auto =
      listings
      |> Enum.with_index()
      |> Enum.map(fn {listing, index} ->
        id = listing["id"] || "temp-#{index}"
        Map.put(listing, "id", id)
      end)
      |> Enum.reject(&present_manual?(&1))

    groups =
      Enum.group_by(auto, fn listing ->
        listing
        |> base_location_label()
        |> normalize_key()
      end)

    titles =
      Enum.reduce(groups, %{}, fn {_key, group}, acc ->
        if length(group) == 1 do
          [listing] = group
          Map.put(acc, listing["id"], base_location_label(listing))
        else
          Map.merge(acc, assign_numbered_titles(group))
        end
      end)

    Enum.map(listings, fn listing ->
      cond do
        present_manual?(listing) ->
          Map.put(listing, "title", String.trim(listing["manualTitle"]))

        Map.has_key?(titles, listing["id"]) ->
          Map.put(listing, "title", Map.get(titles, listing["id"]))

        true ->
          Map.put(listing, "title", base_location_label(listing))
      end
    end)
  end

  defp present_manual?(listing) do
    case listing["manualTitle"] do
      v when is_binary(v) -> String.trim(v) != ""
      _ -> false
    end
  end

  defp assign_numbered_titles(group) do
    base = base_location_label(hd(group))

    group
    |> Enum.sort(&sort_by_creation_order/2)
    |> Enum.with_index(1)
    |> Map.new(fn {listing, index} ->
      {listing["id"], "#{base} (#{index})"}
    end)
  end

  defp sort_by_creation_order(a, b) do
    case {parse_created_at(a["createdAt"]), parse_created_at(b["createdAt"])} do
      {{:ok, a_time}, {:ok, b_time}} when a_time != b_time ->
        DateTime.compare(a_time, b_time) != :gt

      _ ->
        (a["id"] || "") <= (b["id"] || "")
    end
  end

  defp parse_created_at(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> {:ok, dt}
      _ -> :error
    end
  end

  defp parse_created_at(_), do: :error

  defp base_location_label(listing) do
    location_at_level(listing, :rua) ||
      location_at_level(listing, :bairro) ||
      location_at_level(listing, :cidade) ||
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

    if placeholder_endereco?(endereco) do
      nil
    else
      extract_street_two_words(endereco)
    end
  end

  defp placeholder_endereco?(endereco) do
    trimmed = endereco |> to_string() |> String.trim() |> String.downcase()
    trimmed == "" or trimmed == "endereço não informado"
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
      |> Enum.take_while(&(not Regex.match?(~r/^\d+$/, &1)))

    case words do
      [] -> nil
      _ -> title_case_location(Enum.join(words, " "))
    end
  end

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
