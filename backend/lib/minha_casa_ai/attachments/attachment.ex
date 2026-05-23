defmodule MinhaCasaAi.Attachments.Attachment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "ai_attachments" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :storage_key, :string
    field :filename, :string
    field :content_type, :string
    field :byte_size, :integer
    field :source, :string
    field :metadata, :map, default: %{}
    timestamps(type: :utc_datetime)
  end

  def changeset(attachment, attrs) do
    attachment
    |> cast(attrs, [
      :user_id,
      :org_id,
      :storage_key,
      :filename,
      :content_type,
      :byte_size,
      :source,
      :metadata
    ])
    |> validate_required([:storage_key, :content_type, :byte_size, :source])
  end
end
