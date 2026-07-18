defmodule MinhaCasaAi.Accounts.PlatformUserRole do
  use Ecto.Schema
  import Ecto.Changeset

  @roles ~w(super_admin)

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "platform_user_roles" do
    field :user_id, :binary_id
    field :role, :string
    field :granted_by_user_id, :binary_id
    field :granted_at, :utc_datetime
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def roles, do: @roles

  def changeset(platform_role, attrs) do
    platform_role
    |> cast(attrs, [:user_id, :role, :granted_by_user_id, :granted_at])
    |> validate_required([:user_id, :role])
    |> validate_inclusion(:role, @roles)
    |> unique_constraint([:user_id, :role])
  end
end
