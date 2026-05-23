defmodule MinhaCasaAi.Telegram.LinkCode do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "telegram_link_codes" do
    field :code, :string
    field :chat_id, :string
    field :telegram_user_id, :string
    field :status, :string, default: "pending"
    field :expires_at, :utc_datetime
    field :consumed_by_user_id, :binary_id

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(link_code, attrs) do
    link_code
    |> cast(attrs, [:code, :chat_id, :telegram_user_id, :status, :expires_at, :consumed_by_user_id])
    |> validate_required([:code, :chat_id, :status, :expires_at])
    |> validate_inclusion(:status, ["pending", "consumed", "expired"])
    |> unique_constraint(:code)
  end
end
