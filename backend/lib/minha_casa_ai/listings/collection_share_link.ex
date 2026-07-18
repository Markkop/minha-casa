defmodule MinhaCasaAi.Listings.CollectionShareLink do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "collection_share_links" do
    field :collection_id, :binary_id
    field :token_hash, :string
    field :created_by_user_id, :binary_id
    field :expires_at, :utc_datetime
    field :revoked_at, :utc_datetime
    field :last_accessed_at, :utc_datetime
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(link, attrs) do
    link
    |> cast(attrs, [
      :collection_id,
      :token_hash,
      :created_by_user_id,
      :expires_at,
      :revoked_at,
      :last_accessed_at
    ])
    |> validate_required([:collection_id, :token_hash])
    |> unique_constraint(:token_hash)
  end
end
