defmodule MinhaCasaAi.Billing.UserAddon do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "user_addons" do
    field :user_id, :binary_id
    field :addon_slug, :string
    field :granted_at, :utc_datetime
    field :granted_by, :binary_id
    field :enabled, :boolean, default: true
    field :expires_at, :utc_datetime
  end

  def changeset(grant, attrs) do
    grant
    |> cast(attrs, [:user_id, :addon_slug, :granted_at, :granted_by, :enabled, :expires_at])
    |> validate_required([:user_id, :addon_slug, :granted_at])
  end
end
