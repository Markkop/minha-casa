defmodule MinhaCasaAi.Workspace.Region do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "regions" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :city, :string
    field :neighborhood, :string
    field :property_type, :string
    field :price_per_m2, :integer
    field :notes, :string
    field :listing_count, :integer, virtual: true, default: 0
    field :favorite_average_price_per_m2, :integer, virtual: true
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(region, attrs) do
    region
    |> cast(attrs, [:user_id, :org_id, :city, :neighborhood, :property_type, :price_per_m2, :notes])
    |> validate_required([:city, :neighborhood, :property_type, :price_per_m2])
    |> validate_inclusion(:property_type, ["casa", "apartamento"])
    |> validate_number(:price_per_m2, greater_than_or_equal_to: 0)
    |> validate_owner()
  end

  defp validate_owner(changeset) do
    user_id = get_field(changeset, :user_id)
    org_id = get_field(changeset, :org_id)

    cond do
      is_binary(user_id) and is_nil(org_id) -> changeset
      is_nil(user_id) and is_binary(org_id) -> changeset
      true -> add_error(changeset, :base, "invalid owner: require user_id or org_id")
    end
  end
end
