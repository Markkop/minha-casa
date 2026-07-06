defmodule MinhaCasaAi.Organizations.OrganizationInvite do
  use Ecto.Schema
  import Ecto.Changeset

  @roles ~w(owner admin member)
  @statuses ~w(pending accepted revoked)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "organization_invites" do
    field :org_id, :binary_id
    field :token, :string
    field :role, :string, default: "member"
    field :status, :string, default: "pending"
    field :created_by_user_id, :binary_id
    field :accepted_by_user_id, :binary_id
    field :expires_at, :utc_datetime
    field :accepted_at, :utc_datetime
    field :revoked_at, :utc_datetime
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def roles, do: @roles
  def statuses, do: @statuses

  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [
      :org_id,
      :token,
      :role,
      :status,
      :created_by_user_id,
      :accepted_by_user_id,
      :expires_at,
      :accepted_at,
      :revoked_at
    ])
    |> validate_required([:org_id, :token, :role, :status, :expires_at])
    |> validate_inclusion(:role, @roles)
    |> validate_inclusion(:status, @statuses)
    |> unique_constraint(:token)
  end
end
