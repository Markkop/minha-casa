defmodule MinhaCasaAi.Billing.ProcessedWebhookEvent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :string, autogenerate: false}
  schema "processed_webhook_events" do
    field :event_type, :string
    field :processed_at, :utc_datetime
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [:id, :event_type, :processed_at])
    |> validate_required([:id, :event_type, :processed_at])
  end
end
