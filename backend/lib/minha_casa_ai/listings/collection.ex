defmodule MinhaCasaAi.Listings.Collection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "collections" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :name, :string
    field :is_public, :boolean, default: false
    field :share_token, :string
    field :is_default, :boolean, default: false
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(collection, attrs) do
    collection
    |> cast(attrs, [:user_id, :org_id, :name, :is_public, :share_token, :is_default])
    |> validate_required([:name])
  end
end
