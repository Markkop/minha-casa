defmodule MinhaCasaAi.PropertyAnalyses.EnvironmentGrouper do
  @moduledoc """
  Groups inventory images by scene (environment) for per-room agent pipelines.
  """

  @labels %{
    "cozinha" => "Cozinha",
    "sala" => "Sala",
    "fachada" => "Fachada e telhado",
    "banheiro" => "Banheiro",
    "varanda" => "Varanda",
    "quarto" => "Quarto",
    "área externa" => "Área externa e quintal",
    "area externa" => "Área externa e quintal",
    "garagem" => "Garagem",
    "indefinido" => "Outros ambientes"
  }

  @max_environments 6

  def group_inventory(%{"images" => images}) when is_list(images) do
    images
    |> Enum.filter(&analyzable?/1)
    |> Enum.group_by(&scene_key/1)
    |> Enum.map(&build_environment/1)
    |> Enum.sort_by(&Map.get(&1, "scene"))
    |> Enum.take(@max_environments)
  end

  def group_inventory(_), do: []

  defp analyzable?(img) when is_map(img) do
    is_nil(Map.get(img, "error")) and is_map(Map.get(img, "observations"))
  end

  defp analyzable?(_), do: false

  defp scene_key(img) do
    img
    |> Map.get("observations", %{})
    |> Map.get("scene", "indefinido")
    |> normalize_scene()
  end

  defp normalize_scene(nil), do: "indefinido"
  defp normalize_scene(s) when is_binary(s), do: String.downcase(String.trim(s))
  defp normalize_scene(_), do: "indefinido"

  defp build_environment({scene, images}) do
    indices = images |> Enum.map(&Map.get(&1, "index")) |> Enum.filter(&is_integer/1)

    inventory_items =
      images
      |> Enum.flat_map(&inventory_lines/1)
      |> Enum.uniq()
      |> Enum.take(40)

    %{
      "scene" => scene,
      "label" => Map.get(@labels, scene, titleize(scene)),
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

  defp inventory_lines(img) do
    obs = Map.get(img, "observations", %{})

    [
      Map.get(obs, "structure"),
      Map.get(obs, "floor"),
      Map.get(obs, "walls"),
      Map.get(obs, "ceiling"),
      Map.get(obs, "baseboard"),
      Map.get(obs, "openings"),
      Map.get(obs, "wetArea")
    ]
    |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
    |> Kernel.++(Map.get(obs, "materialsSpotted", []))
  end

  defp titleize(scene) do
    scene
    |> String.replace("_", " ")
    |> String.split(" ", trim: true)
    |> Enum.map_join(" ", &String.capitalize/1)
  end
end
