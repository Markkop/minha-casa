defmodule MinhaCasaAiWeb.FloorPlanJSONTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.FloorPlans.{AreaLink, FloorPlan}
  alias MinhaCasaAiWeb.FloorPlanJSON

  test "serializes storage-safe blueprint metadata and effective area names" do
    now = DateTime.utc_now(:second)
    collection_id = Ecto.UUID.generate()

    floor_plan = %FloorPlan{
      id: Ecto.UUID.generate(),
      workspace_id: Ecto.UUID.generate(),
      listing_id: Ecto.UUID.generate(),
      created_by_user_id: Ecto.UUID.generate(),
      name: "Planta 1",
      document: %{"version" => 2, "shapes" => []},
      revision: 3,
      blueprint_storage_key: "floor-plans/private/key.png",
      blueprint_content_type: "image/png",
      blueprint_byte_size: 1234,
      blueprint_width: 800,
      blueprint_height: 600,
      area_links: [
        %AreaLink{
          id: Ecto.UUID.generate(),
          shape_id: "room-1",
          environment_id: Ecto.UUID.generate(),
          environment_name: "Quarto 1",
          custom_name: "Suíte",
          inherited_name_snapshot: "Quarto"
        }
      ],
      created_at: now,
      updated_at: now
    }

    %{floorPlan: payload} = FloorPlanJSON.show(floor_plan, collection_id)

    assert payload.workspaceId == floor_plan.workspace_id
    assert payload.createdByUserId == floor_plan.created_by_user_id
    assert payload.blueprint.contentType == "image/png"
    assert payload.blueprint.width == 800
    refute Map.has_key?(payload.blueprint, :storageKey)
    assert [%{effectiveName: "Suíte", inheritedName: "Quarto"}] = payload.areaLinks
    refute inspect(payload) =~ "floor-plans/private/key.png"
  end
end
