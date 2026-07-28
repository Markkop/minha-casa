defmodule MinhaCasaAiWeb.FloorPlanJSON do
  alias MinhaCasaAi.FloorPlans.{AreaLink, FloorPlan}

  def index(floor_plans, collection_id) do
    %{floorPlans: Enum.map(floor_plans, &floor_plan(&1, collection_id))}
  end

  def show(%FloorPlan{} = floor_plan, collection_id) do
    %{floorPlan: floor_plan(floor_plan, collection_id)}
  end

  def floor_plan(%FloorPlan{} = floor_plan, collection_id) do
    %{
      id: floor_plan.id,
      collectionId: collection_id,
      workspaceId: floor_plan.workspace_id,
      listingId: floor_plan.listing_id,
      createdByUserId: floor_plan.created_by_user_id,
      name: floor_plan.name,
      document: floor_plan.document,
      revision: floor_plan.revision,
      blueprint: blueprint(floor_plan, collection_id),
      areaLinks: Enum.map(loaded_links(floor_plan), &area_link/1),
      createdAt: floor_plan.created_at,
      updatedAt: floor_plan.updated_at
    }
  end

  defp blueprint(%FloorPlan{blueprint_storage_key: nil}, _collection_id), do: nil

  defp blueprint(%FloorPlan{} = floor_plan, collection_id) do
    %{
      contentType: floor_plan.blueprint_content_type,
      byteSize: floor_plan.blueprint_byte_size,
      width: floor_plan.blueprint_width,
      height: floor_plan.blueprint_height,
      url:
        "/api/collections/#{collection_id}/listings/#{floor_plan.listing_id}/floor-plans/#{floor_plan.id}/blueprint"
    }
  end

  defp area_link(%AreaLink{} = link) do
    effective_name = link.custom_name || link.environment_name || link.inherited_name_snapshot

    %{
      id: link.id,
      shapeId: link.shape_id,
      environmentId: link.environment_id,
      environmentName: link.environment_name,
      customName: link.custom_name,
      inheritedName: link.inherited_name_snapshot,
      inheritedNameSnapshot: link.inherited_name_snapshot,
      effectiveName: effective_name
    }
  end

  defp loaded_links(%FloorPlan{area_links: links}) when is_list(links), do: links
  defp loaded_links(_), do: []
end
