defmodule MinhaCasaAi.PropertyAnalyses.SpaceGuardTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses.SpaceGuard

  test "consolidates duplicate spaceId without dropping photos" do
    spaces = [
      %{
        "spaceId" => "quarto",
        "scene" => "quarto",
        "imageIndices" => [0]
      },
      %{
        "spaceId" => "quarto",
        "scene" => "quarto",
        "imageIndices" => [2]
      }
    ]

    photos = [
      %{"index" => 0, "scene" => "quarto", "floor" => "laminado claro"},
      %{"index" => 2, "scene" => "quarto", "floor" => "ceramica escura"}
    ]

    result = SpaceGuard.refine_spaces(spaces, photos)

    assert length(result) == 2
    assert Enum.sort(Enum.flat_map(result, & &1["imageIndices"])) == [0, 2]
  end

  test "splits one quarto when inventory signatures differ" do
    spaces = [
      %{
        "spaceId" => "quarto",
        "scene" => "quarto",
        "label" => "Quarto",
        "imageIndices" => [0, 1]
      }
    ]

    photos = [
      %{"index" => 0, "scene" => "quarto", "floor" => "laminado claro", "walls" => "branco"},
      %{"index" => 1, "scene" => "quarto", "floor" => "ceramica escura", "walls" => "bege"}
    ]

    result = SpaceGuard.refine_spaces(spaces, photos)

    assert length(result) == 2
    assert Enum.map(result, & &1["spaceId"]) |> Enum.sort() == ["quarto-1", "quarto-2"]
  end

  test "recovers provisional splits when reconciler collapsed bedrooms" do
    provisional = [
      %{"spaceId" => "quarto-1", "scene" => "quarto", "imageIndices" => [0]},
      %{"spaceId" => "quarto-2", "scene" => "quarto", "imageIndices" => [1]}
    ]

    reconciled = [
      %{"spaceId" => "quarto", "scene" => "quarto", "imageIndices" => [0, 1]}
    ]

    photos = [
      %{"index" => 0, "scene" => "quarto"},
      %{"index" => 1, "scene" => "quarto"}
    ]

    result = SpaceGuard.refine_spaces(reconciled, photos, provisional)

    assert length(result) == 2
    assert Enum.map(result, & &1["spaceId"]) |> Enum.sort() == ["quarto-1", "quarto-2"]
  end

  test "splits single banheiro when listing declares two and photos differ only slightly" do
    spaces = [
      %{
        "spaceId" => "banheiro",
        "scene" => "banheiro",
        "imageIndices" => [0, 1]
      }
    ]

    photos = [
      %{"index" => 0, "scene" => "banheiro", "wetAreaFixtures" => "pia branca"},
      %{"index" => 1, "scene" => "banheiro", "wetAreaFixtures" => "pia branca"}
    ]

    result = SpaceGuard.refine_spaces(spaces, photos, nil, %{"banheiros" => 2})

    assert length(result) == 2
    assert Enum.map(result, & &1["spaceId"]) |> Enum.sort() == ["banheiro-1", "banheiro-2"]
  end
end
