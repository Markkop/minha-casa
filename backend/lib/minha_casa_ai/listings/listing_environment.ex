defmodule MinhaCasaAi.Listings.ListingEnvironment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @kinds ~w(exterior livingRoom kitchen bedroom bathroom garage balcony utilityRoom custom)

  schema "listing_environments" do
    field :listing_id, :binary_id
    field :kind, :string
    field :name, :string
    field :ordinal, :integer
    field :position, :integer
    field :source, :string, default: "manual"
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def kinds, do: @kinds

  def changeset(environment, attrs) do
    environment
    |> cast(attrs, [:id, :listing_id, :kind, :name, :ordinal, :position, :source])
    |> update_change(:name, &String.trim/1)
    |> validate_required([:listing_id, :kind, :name, :position, :source])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_inclusion(:kind, @kinds)
    |> validate_inclusion(:source, ["manual"])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> validate_number(:ordinal, greater_than: 0)
    |> unique_constraint([:listing_id, :position])
    |> foreign_key_constraint(:listing_id)
  end
end
