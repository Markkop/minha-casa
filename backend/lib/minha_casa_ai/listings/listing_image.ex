defmodule MinhaCasaAi.Listings.ListingImage do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "listing_images" do
    field :listing_id, :binary_id
    field :source_url, :string
    field :storage_key, :string
    field :fingerprint, :map
    field :position, :integer
    field :is_cover, :boolean, default: false
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(image, attrs) do
    image
    |> cast(attrs, [:listing_id, :source_url, :storage_key, :fingerprint, :position, :is_cover])
    |> validate_required([:listing_id, :position, :is_cover])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint([:listing_id, :position])
    |> unique_constraint(:listing_id, name: :listing_images_one_cover_idx)
    |> foreign_key_constraint(:listing_id)
  end
end
