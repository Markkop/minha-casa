defmodule MinhaCasaAi.Organizations.Organization do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "organizations" do
    field :name, :string
    field :slug, :string
    field :owner_id, :binary_id
    field :workspace_id, :binary_id
    field :kind, :string, default: "family"
    field :status, :string, default: "active"
    field :settings, :map, default: %{}
    field :billing_owner_user_id, :binary_id
    field :sponsor_user_id, :binary_id
    field :stripe_customer_id, :string
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(organization, attrs) do
    organization
    |> cast(attrs, [
      :name,
      :slug,
      :owner_id,
      :workspace_id,
      :kind,
      :status,
      :settings,
      :billing_owner_user_id,
      :sponsor_user_id,
      :stripe_customer_id
    ])
    |> validate_required([:name, :slug, :owner_id, :workspace_id, :kind, :status])
    |> validate_format(:slug, ~r/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    |> validate_inclusion(:kind, ~w(family agency))
    |> validate_inclusion(:status, ~w(active frozen archived))
    |> unique_constraint(:slug)
    |> unique_constraint(:workspace_id)
  end

  def update_changeset(organization, attrs) do
    organization
    |> cast(attrs, [
      :name,
      :status,
      :settings,
      :billing_owner_user_id,
      :sponsor_user_id,
      :stripe_customer_id
    ])
    |> validate_required([:name])
    |> validate_inclusion(:status, ~w(active frozen archived))
  end
end
