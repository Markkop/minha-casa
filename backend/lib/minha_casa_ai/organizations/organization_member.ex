defmodule MinhaCasaAi.Organizations.OrganizationMember do
  use Ecto.Schema
  import Ecto.Changeset

  @roles ~w(owner admin member)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "organization_members" do
    field :org_id, :binary_id
    field :user_id, :binary_id
    field :role, :string, default: "member"
    field :joined_at, :utc_datetime
  end

  def roles, do: @roles

  def changeset(member, attrs) do
    member
    |> cast(attrs, [:org_id, :user_id, :role, :joined_at])
    |> validate_required([:org_id, :user_id, :role])
    |> validate_inclusion(:role, @roles)
    |> unique_constraint([:org_id, :user_id], name: :organization_members_org_user_idx)
  end
end
