defmodule MinhaCasaAi.Listings.ListingEnvironmentImage do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @foreign_key_type :binary_id

  schema "listing_environment_images" do
    field :environment_id, :binary_id, primary_key: true
    field :image_id, :binary_id, primary_key: true
    field :position, :integer
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(assignment, attrs) do
    assignment
    |> cast(attrs, [:environment_id, :image_id, :position])
    |> validate_required([:environment_id, :image_id, :position])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint(:image_id)
    |> unique_constraint([:environment_id, :position])
    |> foreign_key_constraint(:environment_id)
    |> foreign_key_constraint(:image_id)
  end
end
