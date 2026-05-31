defmodule MinhaCasaAi.Billing.OrganizationAddon do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "organization_addons" do
    field :organization_id, :binary_id
    field :addon_slug, :string
    field :granted_at, :utc_datetime
    field :granted_by, :binary_id
    field :enabled, :boolean, default: true
    field :expires_at, :utc_datetime
  end

  def changeset(grant, attrs) do
    grant
    |> cast(attrs, [
      :organization_id,
      :addon_slug,
      :granted_at,
      :granted_by,
      :enabled,
      :expires_at
    ])
    |> validate_required([:organization_id, :addon_slug, :granted_at])
  end
end
