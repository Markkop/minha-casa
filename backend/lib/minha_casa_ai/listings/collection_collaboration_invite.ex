defmodule MinhaCasaAi.Listings.CollectionCollaborationInvite do
  use Ecto.Schema
  import Ecto.Changeset

  @roles ~w(viewer editor)
  @statuses ~w(pending accepted revoked expired)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "collection_collaboration_invites" do
    field :collection_id, :binary_id
    field :token_hash, :string
    field :role, :string, default: "editor"
    field :status, :string, default: "pending"
    field :invited_email, :string
    field :created_by_user_id, :binary_id
    field :accepted_by_user_id, :binary_id
    field :expires_at, :utc_datetime
    field :accepted_at, :utc_datetime
    field :revoked_at, :utc_datetime
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [
      :collection_id,
      :token_hash,
      :role,
      :status,
      :invited_email,
      :created_by_user_id,
      :accepted_by_user_id,
      :expires_at,
      :accepted_at,
      :revoked_at
    ])
    |> validate_required([:collection_id, :token_hash, :role, :status, :expires_at])
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:token_hash)
  end
end
