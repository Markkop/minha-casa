defmodule MinhaCasaAi.Chat.Conversation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "chat_conversations" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :channel, :string
    field :status, :string, default: "open"
    field :metadata, :map, default: %{}
    timestamps(type: :utc_datetime)
  end

  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:user_id, :org_id, :channel, :status, :metadata])
    |> validate_required([:channel, :status])
  end
end
