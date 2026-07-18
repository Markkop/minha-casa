defmodule MinhaCasaAi.Billing.Plan do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "plans" do
    field :name, :string
    field :slug, :string
    field :description, :string
    field :price_in_cents, :integer, default: 0
    field :is_active, :boolean, default: true
    field :stripe_price_id, :string
    field :included_seats, :integer
    field :additional_seat_price_in_cents, :integer
    field :stripe_additional_seat_price_id, :string
    field :limits, :map, default: %{}
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def stripe_changeset(plan, attrs) do
    plan
    |> cast(attrs, [:stripe_price_id, :stripe_additional_seat_price_id])
  end
end
