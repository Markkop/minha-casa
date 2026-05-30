defmodule MinhaCasaAi.ListingImages.VisualAnalysis do
  @moduledoc """
  Lightweight image similarity metadata for listing galleries.

  This module intentionally avoids semantic room classification. It extracts
  visual signatures that are cheap to compare and produces a stable display
  order that keeps visually similar photos close to each other.
  """

  @schema_version 1
  @engine "image-v0.67-dhash-palette"
  @hash_size_bits 64

  @type feature :: %{
          required(String.t()) => term()
        }

  def schema_version, do: @schema_version
  def engine, do: @engine

  @doc """
  Builds visual analysis metadata for downloaded images.

  Entries must contain compact gallery indices and image bytes:
  `%{index: non_neg_integer(), bytes: binary()}`.
  """
  def analyze_images(entries, opts \\ []) when is_list(entries) do
    count = Keyword.get(opts, :count, length(entries))
    cover_index = Keyword.get(opts, :cover_index, 0)
    generated_at = Keyword.get_lazy(opts, :generated_at, fn -> DateTime.utc_now() end)

    features =
      entries
      |> Enum.map(fn entry ->
        with %{index: index, bytes: bytes} when is_integer(index) and is_binary(bytes) <- entry,
             {:ok, feature} <- extract_feature(index, bytes) do
          feature
        else
          _ -> nil
        end
      end)
      |> Enum.reject(&is_nil/1)

    analysis_from_features(features, count,
      cover_index: cover_index,
      generated_at: generated_at
    )
  end

  @doc """
  Extracts a compact feature object for one image.
  """
  def extract_feature(index, bytes) when is_integer(index) and index >= 0 and is_binary(bytes) do
    with {:ok, image} <- Image.from_binary(bytes),
         {:ok, hash} <- Image.dhash(image, @hash_size_bits),
         {:ok, palette} <- Image.dominant_color(image, method: :histogram, top_n: 3) do
      {width, height, _bands} = Image.shape(image)
      colors = normalize_palette(palette)

      {:ok,
       %{
         "index" => index,
         "dhash" => Base.encode16(hash, case: :lower),
         "hashSizeBits" => @hash_size_bits,
         "dominantColor" => List.first(colors),
         "palette" => colors,
         "width" => width,
         "height" => height
       }}
    else
      _ -> {:error, :feature_extraction_failed}
    end
  rescue
    _ -> {:error, :feature_extraction_failed}
  catch
    _, _ -> {:error, :feature_extraction_failed}
  end

  @doc """
  Builds metadata from already extracted features.
  """
  def analysis_from_features(features, count, opts \\ [])
      when is_list(features) and is_integer(count) and count >= 0 do
    cover_index = normalize_cover_index(Keyword.get(opts, :cover_index, 0), count)
    generated_at = Keyword.get_lazy(opts, :generated_at, fn -> DateTime.utc_now() end)
    normalized_features = normalize_features(features, count)

    %{
      "schemaVersion" => @schema_version,
      "engine" => @engine,
      "generatedAt" => DateTime.to_iso8601(generated_at),
      "order" => order(normalized_features, count, cover_index: cover_index),
      "features" => normalized_features
    }
  end

  @doc """
  Produces a valid display order for a gallery of `count` images.
  """
  def order(features, count, opts \\ [])
      when is_list(features) and is_integer(count) and count >= 0 do
    cover_index = normalize_cover_index(Keyword.get(opts, :cover_index, 0), count)
    by_index = Map.new(normalize_features(features, count), &{&1["index"], &1})
    valid_indices = Map.keys(by_index) |> Enum.sort()

    visual_order =
      cond do
        count == 0 ->
          []

        map_size(by_index) < 2 ->
          if Map.has_key?(by_index, cover_index), do: [cover_index], else: []

        true ->
          nearest_neighbor_order(by_index, valid_indices, cover_index)
      end

    missing =
      count
      |> all_indices()
      |> Enum.reject(&(&1 in visual_order))

    visual_order ++ missing
  end

  @doc """
  Returns a combined perceptual distance. Lower means more similar.
  """
  def distance(left, right) when is_map(left) and is_map(right) do
    hash_distance(left, right) * 0.7 + color_distance(left, right) * 0.3
  end

  defp nearest_neighbor_order(by_index, valid_indices, cover_index) do
    start = if cover_index in valid_indices, do: cover_index, else: hd(valid_indices)

    do_nearest_neighbor_order(by_index, [start], valid_indices -- [start])
  end

  defp do_nearest_neighbor_order(_by_index, ordered, []), do: Enum.reverse(ordered)

  defp do_nearest_neighbor_order(by_index, [current | _] = ordered, remaining) do
    current_feature = Map.fetch!(by_index, current)

    next =
      Enum.min_by(remaining, fn index ->
        {distance(current_feature, Map.fetch!(by_index, index)), index}
      end)

    do_nearest_neighbor_order(by_index, [next | ordered], remaining -- [next])
  end

  defp normalize_features(features, count) do
    features
    |> Enum.filter(&is_map/1)
    |> Enum.map(&normalize_feature/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.filter(fn feature -> feature["index"] in all_indices(count) end)
    |> Enum.uniq_by(& &1["index"])
    |> Enum.sort_by(& &1["index"])
  end

  defp normalize_feature(feature) do
    with index when is_integer(index) <- Map.get(feature, "index"),
         hash when is_binary(hash) <- Map.get(feature, "dhash") do
      %{
        "index" => index,
        "dhash" => String.downcase(hash),
        "hashSizeBits" => Map.get(feature, "hashSizeBits", @hash_size_bits),
        "dominantColor" => normalize_color(Map.get(feature, "dominantColor")),
        "palette" => normalize_palette(Map.get(feature, "palette")),
        "width" => int_or_nil(Map.get(feature, "width")),
        "height" => int_or_nil(Map.get(feature, "height"))
      }
      |> Enum.reject(fn {_key, value} -> is_nil(value) end)
      |> Map.new()
    else
      _ -> nil
    end
  end

  defp normalize_palette([r, g, b] = color)
       when is_integer(r) and is_integer(g) and is_integer(b) do
    case normalize_color(color) do
      nil -> []
      normalized -> [normalized]
    end
  end

  defp normalize_palette(colors) when is_list(colors) do
    colors
    |> Enum.map(&normalize_color/1)
    |> Enum.reject(&is_nil/1)
  end

  defp normalize_palette(_), do: []

  defp normalize_color({r, g, b}), do: normalize_color([r, g, b])

  defp normalize_color([r, g, b]) do
    with r when is_integer(r) and r in 0..255 <- r,
         g when is_integer(g) and g in 0..255 <- g,
         b when is_integer(b) and b in 0..255 <- b do
      [r, g, b]
    else
      _ -> nil
    end
  end

  defp normalize_color(_), do: nil

  defp normalize_cover_index(_index, 0), do: 0

  defp normalize_cover_index(index, count)
       when is_integer(index) and index >= 0 and index < count,
       do: index

  defp normalize_cover_index(_index, _count), do: 0

  defp all_indices(0), do: []
  defp all_indices(count), do: Enum.to_list(0..(count - 1))

  defp hash_distance(%{"dhash" => left}, %{"dhash" => right}) do
    with {:ok, left_bytes} <- Base.decode16(left, case: :mixed),
         {:ok, right_bytes} <- Base.decode16(right, case: :mixed),
         true <- byte_size(left_bytes) == byte_size(right_bytes),
         bits when bits > 0 <- byte_size(left_bytes) * 8 do
      hamming_bytes(left_bytes, right_bytes) / bits
    else
      _ -> 1.0
    end
  end

  defp hash_distance(_left, _right), do: 1.0

  defp color_distance(left, right) do
    left_color = Map.get(left, "dominantColor") || List.first(Map.get(left, "palette", []))
    right_color = Map.get(right, "dominantColor") || List.first(Map.get(right, "palette", []))

    case {left_color, right_color} do
      {[lr, lg, lb], [rr, rg, rb]} ->
        (:math.pow(lr - rr, 2) + :math.pow(lg - rg, 2) + :math.pow(lb - rb, 2))
        |> :math.sqrt()
        |> Kernel./(:math.sqrt(3 * 255 * 255))

      _ ->
        1.0
    end
  end

  defp hamming_bytes(left, right), do: hamming_bytes(left, right, 0)
  defp hamming_bytes(<<>>, <<>>, acc), do: acc

  defp hamming_bytes(<<left_byte, left_rest::binary>>, <<right_byte, right_rest::binary>>, acc) do
    hamming_bytes(left_rest, right_rest, acc + popcount(Bitwise.bxor(left_byte, right_byte)))
  end

  defp popcount(int), do: do_popcount(int, 0)
  defp do_popcount(0, acc), do: acc
  defp do_popcount(int, acc), do: do_popcount(Bitwise.bsr(int, 1), acc + Bitwise.band(int, 1))

  defp int_or_nil(value) when is_integer(value), do: value
  defp int_or_nil(_), do: nil
end
