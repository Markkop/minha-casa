defmodule MinhaCasaAi.WhatsApp.Event do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "whatsapp_events" do
    field :provider_event_id, :string
    field :payload, :map
    field :status, :string, default: "received"
    field :error, :string
    timestamps(type: :utc_datetime)
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [:provider_event_id, :payload, :status, :error])
    |> validate_required([:provider_event_id, :payload, :status])
    |> unique_constraint(:provider_event_id)
  end
end
