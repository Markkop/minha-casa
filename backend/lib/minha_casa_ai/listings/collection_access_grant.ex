defmodule MinhaCasaAi.Listings.CollectionAccessGrant do
  use Ecto.Schema
  import Ecto.Changeset

  @roles ~w(viewer editor)
  @statuses ~w(active revoked expired)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "collection_access_grants" do
    field :collection_id, :binary_id
    field :user_id, :binary_id
    field :role, :string
    field :status, :string, default: "active"
    field :granted_by_user_id, :binary_id
    field :expires_at, :utc_datetime
    field :revoked_at, :utc_datetime
    field :revoked_by_user_id, :binary_id
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(grant, attrs) do
    grant
    |> cast(attrs, [
      :collection_id,
      :user_id,
      :role,
      :status,
      :granted_by_user_id,
      :expires_at,
      :revoked_at,
      :revoked_by_user_id
    ])
    |> validate_required([:collection_id, :user_id, :role, :status])
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint([:collection_id, :user_id])
  end
end
