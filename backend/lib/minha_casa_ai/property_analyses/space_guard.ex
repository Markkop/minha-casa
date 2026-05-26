defmodule MinhaCasaAi.PropertyAnalyses.SpaceGuard do
  @moduledoc """
  Post-processes photo space lists to avoid over-merging distinct rooms
  (e.g. two bedrooms collapsed into one).
  """

  alias MinhaCasaAi.PropertyAnalyses.SpaceSlug

  @multiplex_scenes ~w(quarto suite banheiro sala escritorio)
  @listing_scene_keys [{"quarto", "quartos"}, {"suite", "suites"}, {"banheiro", "banheiros"}]
  @signature_fields ~w(
    floor walls ceiling baseboard openings
    wetAreaFixtures layoutAnchors distinctivenessNotes
  )

  @doc """
  Merges duplicate spaceIds by union of imageIndices (instead of dropping rows).
  Splits spaces when photos in the same space have clearly different inventory signatures.
  Recovers provisional splits if reconciler collapsed multiplex scenes.
  """
  def refine_spaces(spaces, photo_summaries, provisional_spaces \\ nil, listing_facts \\ %{}) do
    photos_by_index = Map.new(photo_summaries, &{Map.get(&1, "index"), &1})

    spaces
    |> consolidate_by_space_id()
    |> split_overmerged_by_inventory(photos_by_index)
    |> recover_provisional_splits(provisional_spaces)
    |> force_listing_minimum_splits(listing_facts)
    |> split_unassigned_by_scene(photos_by_index, listing_facts)
    |> Enum.take(max_spaces())
  end

  defp consolidate_by_space_id(spaces) when is_list(spaces) do
    Enum.reduce(spaces, %{}, fn space, acc ->
      id = Map.get(space, "spaceId") || "indefinido"

      case Map.get(acc, id) do
        nil ->
          Map.put(acc, id, space)

        existing ->
          merged =
            existing
            |> Map.update!("imageIndices", fn indices ->
              ((indices || []) ++ (Map.get(space, "imageIndices") || []))
              |> Enum.filter(&is_integer/1)
              |> Enum.uniq()
            end)

          Map.put(acc, id, merged)
      end
    end)
    |> Map.values()
  end

  defp consolidate_by_space_id(_), do: []

  defp split_overmerged_by_inventory(spaces, photos_by_index) when is_list(spaces) do
    Enum.flat_map(spaces, fn space ->
      split_space_if_needed(space, photos_by_index)
    end)
  end

  defp split_space_if_needed(space, photos_by_index) do
    scene = normalize_scene(Map.get(space, "scene"))
    indices = Map.get(space, "imageIndices") || []

    cond do
      scene not in @multiplex_scenes -> [space]
      length(indices) < 2 -> [space]
      true ->
        groups =
          indices
          |> Enum.group_by(&photo_signature(Map.get(photos_by_index, &1, %{})))

        non_empty = Map.delete(groups, "")

        if map_size(non_empty) > 1 do
          numbered_splits(space, non_empty)
        else
          [space]
        end
    end
  end

  defp numbered_splits(space, groups) do
    scene = normalize_scene(Map.get(space, "scene"))
    base_id = Map.get(space, "spaceId") || scene

    groups
    |> Enum.sort_by(fn {_sig, indices} -> Enum.min(indices, fn -> 0 end) end)
    |> Enum.with_index(1)
    |> Enum.map(fn {{_sig, indices}, n} ->
      space_id = numbered_space_id(base_id, scene, n)

      space
      |> Map.put("spaceId", space_id)
      |> Map.put("label", numbered_label(scene, n))
      |> Map.put("imageIndices", Enum.sort(indices))
    end)
  end

  defp numbered_space_id(base_id, scene, n) do
    root =
      base_id
      |> SpaceSlug.slug()
      |> String.replace(~r/-\d+$/, "")

    if root in ["", "indefinido"], do: "#{scene}-#{n}", else: "#{root}-#{n}"
  end

  defp recover_provisional_splits(spaces, provisional) when is_list(provisional) do
    if length(provisional) == 0 do
      spaces
    else
      Enum.reduce(@multiplex_scenes, spaces, fn scene, acc ->
        prov_count = count_scene(provisional, scene)
        cur_count = count_scene(acc, scene)

        if prov_count > cur_count and prov_count >= 2 do
          replace_scene_spaces(acc, provisional, scene)
        else
          acc
        end
      end)
    end
  end

  defp recover_provisional_splits(spaces, _), do: spaces

  defp force_listing_minimum_splits(spaces, listing_facts) when is_list(spaces) do
    Enum.reduce(@listing_scene_keys, spaces, fn {scene, listing_key}, acc ->
      min_count = listing_count(listing_facts, listing_key)
      scene_spaces = Enum.filter(acc, &(normalize_scene(Map.get(&1, "scene")) == scene))
      rest = Enum.reject(acc, &(normalize_scene(Map.get(&1, "scene")) == scene))

      cond do
        is_nil(min_count) or min_count < 2 ->
          acc

        length(scene_spaces) != 1 ->
          acc

        true ->
          space = hd(scene_spaces)
          indices = Map.get(space, "imageIndices") || []

          if length(indices) >= min_count do
            rest ++ split_indices_into_spaces(space, scene, indices, min_count)
          else
            acc
          end
      end
    end)
  end

  defp force_listing_minimum_splits(spaces, _), do: spaces

  defp split_indices_into_spaces(space, scene, indices, count) do
    sorted = Enum.sort(indices)
    chunk_size = max(1, div(length(sorted), count))

    sorted
    |> Enum.chunk_every(chunk_size)
    |> Enum.take(count)
    |> Enum.with_index(1)
    |> Enum.map(fn {chunk, n} ->
      space
      |> Map.put("spaceId", numbered_space_id(Map.get(space, "spaceId") || scene, scene, n))
      |> Map.put("label", numbered_label(scene, n))
      |> Map.put("imageIndices", chunk)
      |> Map.put("visible", true)
    end)
  end

  defp replace_scene_spaces(current, provisional, scene) do
    kept = Enum.reject(current, &(normalize_scene(Map.get(&1, "scene")) == scene))
    added = Enum.filter(provisional, &(normalize_scene(Map.get(&1, "scene")) == scene))
    kept ++ added
  end

  defp split_unassigned_by_scene(spaces, photos_by_index, listing_facts) do
    assigned =
      spaces
      |> Enum.flat_map(&Map.get(&1, "imageIndices", []))
      |> MapSet.new()

    targets =
      %{
        "quarto" => listing_count(listing_facts, "quartos"),
        "banheiro" => listing_count(listing_facts, "banheiros")
      }
      |> Enum.reject(fn {_scene, count} -> is_nil(count) or count < 2 end)

    if targets == [] do
      spaces
    else
      Enum.reduce(targets, spaces, fn {scene, min_count}, acc ->
        ensure_scene_count(acc, photos_by_index, assigned, scene, min_count)
      end)
    end
  end

  defp ensure_scene_count(spaces, photos_by_index, assigned, scene, min_count) do
    cur = count_scene(spaces, scene)

    if cur >= min_count do
      spaces
    else
      candidates =
        photos_by_index
        |> Map.values()
        |> Enum.filter(fn photo ->
          normalize_scene(Map.get(photo, "scene")) == scene and
            not MapSet.member?(assigned, Map.get(photo, "index"))
        end)

      if length(candidates) < 2 do
        spaces
      else
        groups = Enum.group_by(candidates, &photo_signature/1)
        non_empty = Map.delete(groups, "")

        if map_size(non_empty) >= min_count do
          split_unassigned_into_spaces(spaces, scene, non_empty, assigned)
        else
          spaces
        end
      end
    end
  end

  defp split_unassigned_into_spaces(spaces, scene, groups, assigned) do
    existing = Enum.filter(spaces, &(normalize_scene(Map.get(&1, "scene")) == scene))
    base = List.first(existing) || %{"scene" => scene, "listingRole" => default_role(scene)}

    new_spaces =
      groups
      |> Enum.sort_by(fn {_sig, photos} ->
        photos |> Enum.map(&Map.get(&1, "index")) |> Enum.min(fn -> 0 end)
      end)
      |> Enum.with_index(1)
      |> Enum.map(fn {{_sig, photos}, n} ->
        indices = photos |> Enum.map(&Map.get(&1, "index")) |> Enum.filter(&is_integer/1)

        base
        |> Map.put("spaceId", "#{scene}-#{n}")
        |> Map.put("label", numbered_label(scene, n))
        |> Map.put("imageIndices", indices)
        |> Map.put("visible", true)
      end)

    other = Enum.reject(spaces, &(normalize_scene(Map.get(&1, "scene")) == scene))
    other ++ new_spaces
  end

  defp photo_signature(photo) when is_map(photo) do
    parts =
      @signature_fields
      |> Enum.map(&Map.get(photo, &1))
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
      |> Enum.map(&(String.downcase(String.trim(&1))))

    case parts do
      [] ->
        (Map.get(photo, "materialsSpotted") || [])
        |> Enum.map(&(String.downcase(String.trim(&1))))
        |> Enum.reject(&(&1 == ""))
        |> Enum.join("|")

      _ ->
        Enum.join(parts, "|")
    end
  end

  defp photo_signature(_), do: ""

  defp count_scene(spaces, scene) do
    Enum.count(spaces, &(normalize_scene(Map.get(&1, "scene")) == scene))
  end

  defp normalize_scene(nil), do: "indefinido"

  defp normalize_scene(s) when is_binary(s) do
    s |> String.downcase() |> String.trim()
  end

  defp normalize_scene(_), do: "indefinido"

  defp numbered_label("banheiro", n), do: "Banheiro #{n}"
  defp numbered_label("quarto", n), do: "Quarto #{n}"
  defp numbered_label("suite", n), do: "Suíte #{n}"
  defp numbered_label("sala", n), do: "Sala #{n}"
  defp numbered_label("escritorio", n), do: "Escritório #{n}"
  defp numbered_label(_scene, n), do: "Ambiente #{n}"

  defp default_role("banheiro"), do: "banheiro"
  defp default_role("quarto"), do: "dormitorio"
  defp default_role("suite"), do: "suite"
  defp default_role("sala"), do: "social"
  defp default_role(_), do: "indefinido"

  defp listing_count(facts, key) when is_map(facts) do
    case Map.get(facts, key) do
      n when is_integer(n) and n > 0 -> n
      n when is_binary(n) ->
        case Integer.parse(String.trim(n)) do
          {v, _} when v > 0 -> v
          _ -> nil
        end

      _ ->
        nil
    end
  end

  defp listing_count(_, _), do: nil

  defp max_spaces do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_analysis_max_spaces, 10)
  end
end
