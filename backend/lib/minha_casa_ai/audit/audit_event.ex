defmodule MinhaCasaAi.Audit.AuditEvent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "audit_events" do
    field :actor_user_id, :binary_id
    field :workspace_id, :binary_id
    field :action, :string
    field :target_type, :string
    field :target_id, :binary_id
    field :before, :map
    field :after, :map
    field :metadata, :map, default: %{}
    field :ip_address, :string
    field :request_id, :string
    field :occurred_at, :utc_datetime
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [
      :actor_user_id,
      :workspace_id,
      :action,
      :target_type,
      :target_id,
      :before,
      :after,
      :metadata,
      :ip_address,
      :request_id,
      :occurred_at
    ])
    |> validate_required([:action, :target_type])
  end
end
