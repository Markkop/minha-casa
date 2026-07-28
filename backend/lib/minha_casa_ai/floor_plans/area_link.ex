defmodule MinhaCasaAi.FloorPlans.AreaLink do
  use Ecto.Schema
  import Ecto.Changeset

  alias MinhaCasaAi.FloorPlans.FloorPlan

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "floor_plan_area_links" do
    belongs_to :floor_plan, FloorPlan
    field :environment_id, :binary_id
    field :shape_id, :string
    field :custom_name, :string
    field :inherited_name_snapshot, :string
    field :environment_name, :string, virtual: true

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(area_link, attrs) do
    area_link
    |> cast(attrs, [
      :floor_plan_id,
      :environment_id,
      :shape_id,
      :custom_name,
      :inherited_name_snapshot
    ])
    |> normalize_optional_name(:custom_name)
    |> normalize_optional_name(:inherited_name_snapshot)
    |> validate_required([:floor_plan_id, :shape_id])
    |> validate_length(:shape_id, min: 1, max: 160)
    |> validate_length(:custom_name, max: 120)
    |> validate_length(:inherited_name_snapshot, max: 120)
    |> foreign_key_constraint(:floor_plan_id)
    |> foreign_key_constraint(:environment_id)
    |> unique_constraint([:floor_plan_id, :shape_id])
  end

  defp normalize_optional_name(changeset, field) do
    update_change(changeset, field, fn
      value when is_binary(value) ->
        case String.trim(value) do
          "" -> nil
          trimmed -> trimmed
        end

      value ->
        value
    end)
  end
end
