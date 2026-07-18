defmodule MinhaCasaAi.AiUsage.Event do
  use Ecto.Schema
  import Ecto.Changeset

  @event_types ~w(reserved consumed released)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "ai_usage_events" do
    field :reservation_id, :binary_id
    field :workspace_id, :binary_id
    field :actor_user_id, :binary_id
    field :event_type, :string
    field :credits_delta, :integer
    field :metadata, :map, default: %{}
    field :occurred_at, :utc_datetime
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [
      :reservation_id,
      :workspace_id,
      :actor_user_id,
      :event_type,
      :credits_delta,
      :metadata,
      :occurred_at
    ])
    |> validate_required([:reservation_id, :workspace_id, :event_type, :credits_delta])
    |> validate_inclusion(:event_type, @event_types)
  end
end
