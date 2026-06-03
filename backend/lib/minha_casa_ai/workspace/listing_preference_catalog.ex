defmodule MinhaCasaAi.Workspace.ListingPreferenceCatalog do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "listing_preference_catalog" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :key, :string
    field :label, :string
    field :source, :string, default: "custom"
    field :visible, :boolean, default: true
    field :sort_order, :integer, default: 0
    field :legacy_key, :string

    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(row, attrs) do
    row
    |> cast(attrs, [:user_id, :org_id, :key, :label, :source, :visible, :sort_order, :legacy_key])
    |> validate_required([:key, :label, :source, :visible, :sort_order])
    |> validate_inclusion(:source, ["system", "custom"])
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
