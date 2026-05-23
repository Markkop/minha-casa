defmodule MinhaCasaAi.Telegram.Identity do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "telegram_identities" do
    field :chat_id, :string
    field :user_id, :binary_id
    field :telegram_user_id, :string
    field :linked_at, :utc_datetime
  end

  def changeset(identity, attrs) do
    identity
    |> cast(attrs, [:chat_id, :user_id, :telegram_user_id, :linked_at])
    |> validate_required([:chat_id, :user_id, :linked_at])
    |> unique_constraint(:chat_id)
  end
end
