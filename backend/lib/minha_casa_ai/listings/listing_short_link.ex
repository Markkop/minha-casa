defmodule MinhaCasaAi.Listings.ListingShortLink do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:short_id, :string, autogenerate: false}
  schema "listing_short_links" do
    field :listing_id, :binary_id
    field :collection_id, :binary_id
    timestamps(inserted_at: :created_at, updated_at: false, type: :utc_datetime)
  end

  def changeset(link, attrs) do
    link
    |> cast(attrs, [:short_id, :listing_id, :collection_id])
    |> validate_required([:short_id, :listing_id, :collection_id])
    |> validate_length(:short_id, min: 4, max: 12)
    |> unique_constraint(:listing_id)
    |> unique_constraint(:short_id)
  end
end
