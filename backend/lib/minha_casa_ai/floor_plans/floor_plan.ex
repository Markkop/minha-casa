defmodule MinhaCasaAi.FloorPlans.FloorPlan do
  use Ecto.Schema
  import Ecto.Changeset

  alias MinhaCasaAi.FloorPlans.AreaLink
  alias MinhaCasaAi.Listings.Listing
  alias MinhaCasaAi.Workspaces.Workspace

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "floor_plans" do
    belongs_to :workspace, Workspace
    belongs_to :listing, Listing
    field :created_by_user_id, :binary_id
    field :name, :string
    field :document, :map, default: %{"version" => 2}
    field :revision, :integer, default: 0
    field :blueprint_storage_key, :string
    field :blueprint_content_type, :string
    field :blueprint_byte_size, :integer
    field :blueprint_width, :integer
    field :blueprint_height, :integer

    has_many :area_links, AreaLink, on_replace: :delete

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def create_changeset(floor_plan, attrs) do
    floor_plan
    |> cast(attrs, [:workspace_id, :listing_id, :created_by_user_id, :name, :document])
    |> normalize_name()
    |> validate_required([:workspace_id, :listing_id, :created_by_user_id, :name, :document])
    |> validate_length(:name, min: 1, max: 120)
    |> validate_document()
    |> foreign_key_constraint(:workspace_id)
    |> foreign_key_constraint(:listing_id)
    |> foreign_key_constraint(:created_by_user_id)
  end

  def rename_changeset(floor_plan, attrs) do
    floor_plan
    |> cast(attrs, [:name])
    |> normalize_name()
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 120)
  end

  def document_changeset(floor_plan, document) do
    floor_plan
    |> change(document: document, revision: floor_plan.revision + 1)
    |> validate_document()
  end

  def blueprint_changeset(floor_plan, attrs) do
    floor_plan
    |> cast(attrs, [
      :blueprint_storage_key,
      :blueprint_content_type,
      :blueprint_byte_size,
      :blueprint_width,
      :blueprint_height
    ])
    |> validate_required([
      :blueprint_storage_key,
      :blueprint_content_type,
      :blueprint_byte_size
    ])
    |> validate_inclusion(:blueprint_content_type, ["image/png", "image/jpeg", "image/webp"])
    |> validate_number(:blueprint_byte_size, greater_than: 0)
    |> validate_optional_dimension(:blueprint_width)
    |> validate_optional_dimension(:blueprint_height)
  end

  def clear_blueprint_changeset(floor_plan) do
    change(floor_plan,
      blueprint_storage_key: nil,
      blueprint_content_type: nil,
      blueprint_byte_size: nil,
      blueprint_width: nil,
      blueprint_height: nil
    )
  end

  def valid_document?(document) when is_map(document) do
    version = Map.get(document, "version", Map.get(document, :version))
    version == 2 and not contains_embedded_data?(document)
  end

  def valid_document?(_), do: false

  defp validate_document(changeset) do
    case get_field(changeset, :document) do
      document when is_map(document) ->
        cond do
          Map.get(document, "version", Map.get(document, :version)) != 2 ->
            add_error(changeset, :document, "version must be 2")

          contains_embedded_data?(document) ->
            add_error(changeset, :document, "must not contain embedded data URLs")

          true ->
            changeset
        end

      _ ->
        add_error(changeset, :document, "must be an object")
    end
  end

  defp contains_embedded_data?(value) when is_map(value) do
    Enum.any?(value, fn {key, child} ->
      to_string(key) == "dataUrl" or contains_embedded_data?(child)
    end)
  end

  defp contains_embedded_data?(value) when is_list(value),
    do: Enum.any?(value, &contains_embedded_data?/1)

  defp contains_embedded_data?("data:" <> _), do: true
  defp contains_embedded_data?(_), do: false

  defp normalize_name(changeset), do: update_change(changeset, :name, &String.trim/1)

  defp validate_optional_dimension(changeset, field) do
    case get_field(changeset, field) do
      nil -> changeset
      _ -> validate_number(changeset, field, greater_than: 0)
    end
  end
end
