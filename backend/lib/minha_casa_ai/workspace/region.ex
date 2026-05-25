defmodule MinhaCasaAi.Workspace.Region do
  use Ecto.Schema

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
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end
end
