defmodule MinhaCasaAi.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "chat_messages" do
    field :conversation_id, :binary_id
    field :role, :string
    field :content, :string
    field :attachments, {:array, :map}, default: []
    field :metadata, :map, default: %{}
    timestamps(type: :utc_datetime)
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:conversation_id, :role, :content, :attachments, :metadata])
    |> validate_required([:conversation_id, :role])
  end
end
