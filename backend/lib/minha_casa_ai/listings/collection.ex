defmodule MinhaCasaAi.Listings.Collection do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "collections" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :name, :string
    field :is_public, :boolean
    field :share_token, :string
    field :is_default, :boolean
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end
end
