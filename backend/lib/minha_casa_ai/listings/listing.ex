defmodule MinhaCasaAi.Listings.Listing do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "listings" do
    field :collection_id, :binary_id
    field :data, :map
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(listing, attrs) do
    listing
    |> cast(attrs, [:collection_id, :data])
    |> validate_required([:collection_id, :data])
  end
end
