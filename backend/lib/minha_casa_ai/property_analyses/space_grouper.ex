defmodule MinhaCasaAi.PropertyAnalyses.SpaceGrouper do
  @moduledoc """
  Groups inventory into distinct spaces for per-room risk pipelines.
  Uses photo-cluster / reconciled spaceAudit when available; falls back to scene grouping.
  """

  alias MinhaCasaAi.PropertyAnalyses.{EnvironmentGrouper, SpaceSlug}

  def group(inventory, space_audit \\ nil) do
    spaces = space_audit && Map.get(space_audit, "spaces")

    skipped? = is_map(space_audit) and Map.get(space_audit, "skipped") == true

    if is_list(spaces) and spaces != [] and not skipped? do
      group_from_spaces(inventory, spaces)
    else
      EnvironmentGrouper.group_inventory(inventory)
      |> Enum.map(&ensure_space_id/1)
    end
  end

  defp group_from_spaces(inventory, spaces) do
    images_by_index =
      (Map.get(inventory, "images") || [])
      |> Enum.filter(&analyzable?/1)
      |> Map.new(fn img -> {Map.get(img, "index"), img} end)

    spaces
    |> Enum.map(fn space -> build_environment(space, images_by_index) end)
    |> Enum.reject(fn env -> (Map.get(env, "imageIndices") || []) == [] end)
    |> Enum.take(max_spaces())
  end

  defp build_environment(space, images_by_index) do
    indices = Map.get(space, "imageIndices") || []
    images = indices |> Enum.map(&Map.get(images_by_index, &1)) |> Enum.reject(&is_nil/1)

    inventory_items =
      images
      |> Enum.flat_map(&inventory_lines/1)
      |> Enum.uniq()
      |> Enum.take(40)

    space_id =
      (Map.get(space, "spaceId") || Map.get(space, "scene", "indefinido"))
      |> SpaceSlug.slug()

    scene = Map.get(space, "scene") || "indefinido"

    %{
      "spaceId" => space_id,
      "scene" => scene,
      "label" => Map.get(space, "label") || space_id,
      "listingRole" => Map.get(space, "listingRole"),
      "imageIndices" => indices,
      "inventory" => %{
        "items" => inventory_items,
        "images" => images
      },
      "status" => "pending",
      "blindSpots" => [],
      "agents" => %{
        "inventariante" => "done",
        "engenheiroCetico" => "pending",
        "orcamentista" => "pending"
      }
    }
  end

  defp ensure_space_id(env) do
    space_id = Map.get(env, "spaceId") || Map.get(env, "scene", "indefinido")
    Map.put(env, "spaceId", space_id)
  end

  defp analyzable?(img) when is_map(img) do
    is_nil(Map.get(img, "error")) and is_map(Map.get(img, "observations"))
  end

  defp analyzable?(_), do: false

  defp inventory_lines(img) do
    obs = Map.get(img, "observations", %{})

    [
      Map.get(obs, "structure"),
      Map.get(obs, "floor"),
      Map.get(obs, "walls"),
      Map.get(obs, "ceiling"),
      Map.get(obs, "baseboard"),
      Map.get(obs, "openings"),
      Map.get(obs, "wetArea"),
      Map.get(obs, "wetAreaFixtures"),
      Map.get(obs, "distinctivenessNotes")
    ]
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
    |> Kernel.++(Map.get(obs, "materialsSpotted", []))
  end

  defp max_spaces do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_analysis_max_spaces, 10)
  end
end
