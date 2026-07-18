defmodule MinhaCasaAi.Listings.Collection do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "collections" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :workspace_id, :binary_id
    field :created_by_user_id, :binary_id
    field :responsible_user_id, :binary_id
    field :name, :string
    field :is_public, :boolean, default: false
    field :share_token, :string
    field :is_default, :boolean, default: false
    field :kind, :string, default: "general"
    field :visibility, :string, default: "private"
    field :source_collection_id, :binary_id
    field :tags, {:array, :string}, default: []
    field :status, :string, default: "active"
    field :publication_settings, :map, default: %{}
    timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
  end

  def changeset(collection, attrs) do
    collection
    |> cast(attrs, [
      :user_id,
      :org_id,
      :workspace_id,
      :created_by_user_id,
      :responsible_user_id,
      :name,
      :is_public,
      :share_token,
      :is_default,
      :kind,
      :visibility,
      :source_collection_id,
      :tags,
      :status,
      :publication_settings
    ])
    |> validate_required([:workspace_id, :name, :kind, :visibility, :status])
    |> validate_inclusion(:kind, ~w(general template presentation))
    |> validate_inclusion(:visibility, ~w(private team))
    |> validate_inclusion(:status, ~w(active archived))
    |> unique_constraint(:is_default, name: :collections_one_default_per_workspace_idx)
  end
end
