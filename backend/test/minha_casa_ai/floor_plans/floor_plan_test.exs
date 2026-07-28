defmodule MinhaCasaAi.FloorPlans.FloorPlanTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.FloorPlans.{AreaLink, FloorPlan}

  test "accepts a version 2 document without embedded image data" do
    changeset =
      FloorPlan.create_changeset(%FloorPlan{}, %{
        workspace_id: Ecto.UUID.generate(),
        listing_id: Ecto.UUID.generate(),
        created_by_user_id: Ecto.UUID.generate(),
        name: "  Planta térrea  ",
        document: %{
          "version" => 2,
          "blueprint" => %{"x" => 10, "y" => 20, "scale" => 1},
          "shapes" => []
        }
      })

    assert changeset.valid?
    assert Ecto.Changeset.get_change(changeset, :name) == "Planta térrea"
  end

  test "rejects legacy and nested data URLs" do
    legacy =
      FloorPlan.create_changeset(%FloorPlan{}, valid_attrs(%{"version" => 1, "shapes" => []}))

    embedded =
      FloorPlan.create_changeset(
        %FloorPlan{},
        valid_attrs(%{
          "version" => 2,
          "blueprint" => %{"dataUrl" => "data:image/png;base64,AAAA"},
          "shapes" => []
        })
      )

    refute legacy.valid?
    assert "version must be 2" in errors_on(legacy).document
    refute embedded.valid?
    assert "must not contain embedded data URLs" in errors_on(embedded).document
  end

  test "area links normalize optional names and constrain their length" do
    changeset =
      AreaLink.changeset(%AreaLink{}, %{
        floor_plan_id: Ecto.UUID.generate(),
        environment_id: Ecto.UUID.generate(),
        shape_id: "room-1",
        custom_name: "  Suíte  ",
        inherited_name_snapshot: "  Quarto 1 "
      })

    assert changeset.valid?
    assert Ecto.Changeset.get_change(changeset, :custom_name) == "Suíte"
    assert Ecto.Changeset.get_change(changeset, :inherited_name_snapshot) == "Quarto 1"

    too_long =
      AreaLink.changeset(%AreaLink{}, %{
        floor_plan_id: Ecto.UUID.generate(),
        shape_id: "room-2",
        custom_name: String.duplicate("a", 121)
      })

    refute too_long.valid?
  end

  defp valid_attrs(document) do
    %{
      workspace_id: Ecto.UUID.generate(),
      listing_id: Ecto.UUID.generate(),
      created_by_user_id: Ecto.UUID.generate(),
      name: "Planta",
      document: document
    }
  end

  defp errors_on(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
