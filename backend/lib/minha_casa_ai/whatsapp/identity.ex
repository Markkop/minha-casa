defmodule MinhaCasaAi.WhatsApp.Identity do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "whatsapp_identities" do
    field :wa_id, :string
    field :user_id, :binary_id
    field :phone, :string
    field :linked_at, :utc_datetime
  end

  def changeset(identity, attrs) do
    identity
    |> cast(attrs, [:wa_id, :user_id, :phone, :linked_at])
    |> validate_required([:wa_id, :user_id, :linked_at])
    |> unique_constraint(:wa_id)
  end
end
