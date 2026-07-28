defmodule MinhaCasaAi.FloorPlans.Storage do
  @moduledoc false

  alias MinhaCasaAi.ListingImages.Storage, as: ObjectStorage

  @extensions %{
    "image/jpeg" => "jpg",
    "image/png" => "png",
    "image/webp" => "webp"
  }

  def put_blueprint(workspace_id, listing_id, floor_plan_id, bytes, content_type)
      when is_binary(bytes) do
    with {:ok, extension} <- Map.fetch(@extensions, content_type) do
      key =
        "floor-plans/#{workspace_id}/#{listing_id}/#{floor_plan_id}/blueprints/#{Ecto.UUID.generate()}.#{extension}"

      ObjectStorage.put_object(key, bytes, content_type)
    else
      :error -> {:error, :invalid_blueprint_type}
    end
  end

  def get_blueprint(storage_key), do: ObjectStorage.get_object(storage_key)
  def delete_blueprint(storage_key), do: ObjectStorage.delete_object(storage_key)
end
