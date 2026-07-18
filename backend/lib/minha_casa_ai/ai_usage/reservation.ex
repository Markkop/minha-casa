defmodule MinhaCasaAi.AiUsage.Reservation do
  use Ecto.Schema
  import Ecto.Changeset

  @statuses ~w(reserved consumed released)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "ai_usage_reservations" do
    field :workspace_id, :binary_id
    field :actor_user_id, :binary_id
    field :collection_id, :binary_id
    field :operation, :string, default: "listing_parse"
    field :credits, :integer, default: 1
    field :status, :string, default: "reserved"
    field :idempotency_key, :string
    field :cycle_starts_at, :utc_datetime
    field :cycle_ends_at, :utc_datetime
    field :consumed_at, :utc_datetime
    field :released_at, :utc_datetime
    field :metadata, :map, default: %{}
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(reservation, attrs) do
    reservation
    |> cast(attrs, [
      :workspace_id,
      :actor_user_id,
      :collection_id,
      :operation,
      :credits,
      :status,
      :idempotency_key,
      :cycle_starts_at,
      :cycle_ends_at,
      :consumed_at,
      :released_at,
      :metadata
    ])
    |> validate_required([
      :workspace_id,
      :operation,
      :credits,
      :status,
      :idempotency_key,
      :cycle_starts_at,
      :cycle_ends_at
    ])
    |> validate_inclusion(:operation, ["listing_parse"])
    |> validate_inclusion(:status, @statuses)
    |> validate_number(:credits, greater_than: 0)
    |> unique_constraint(:idempotency_key)
  end
end
