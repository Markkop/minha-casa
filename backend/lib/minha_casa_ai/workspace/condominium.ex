defmodule MinhaCasaAi.Workspace.Condominium do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "condominiums" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :workspace_id, :binary_id
    field :name, :string
    field :city, :string
    field :neighborhood, :string
    field :address, :string
    field :property_type, :string
    field :amenities, {:array, :string}, default: []
    field :notes, :string
    field :source, :string, default: "manual"
    field :listing_count, :integer, virtual: true, default: 0
    field :listings, {:array, :map}, virtual: true, default: []

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(condominium, attrs) do
    condominium
    |> cast(attrs, [
      :user_id,
      :org_id,
      :workspace_id,
      :name,
      :city,
      :neighborhood,
      :address,
      :property_type,
      :amenities,
      :notes,
      :source
    ])
    |> validate_required([:workspace_id])
    |> validate_required([:name, :source])
    |> validate_inclusion(:source, ["manual", "listing"])
    |> validate_inclusion(:property_type, ["casa", "apartamento"])
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
