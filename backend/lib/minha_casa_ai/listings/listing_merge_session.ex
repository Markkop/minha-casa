defmodule MinhaCasaAi.Listings.ListingMergeSession do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "listing_merge_sessions" do
    field :user_id, :binary_id
    field :org_id, :binary_id
    field :collection_id, :binary_id
    field :target_listing_id, :binary_id
    field :status, :string, default: "preparing"
    field :target_version, :string
    field :imported_data, :map, default: %{}
    field :current_data, :map, default: %{}
    field :payload, :map, default: %{}
    field :error, :string
    field :expires_at, :utc_datetime
    field :applied_at, :utc_datetime
    timestamps(type: :utc_datetime)
  end

  def changeset(session, attrs) do
    session
    |> cast(attrs, [
      :user_id,
      :org_id,
      :collection_id,
      :target_listing_id,
      :status,
      :target_version,
      :imported_data,
      :current_data,
      :payload,
      :error,
      :expires_at,
      :applied_at
    ])
    |> validate_required([
      :collection_id,
      :target_listing_id,
      :status,
      :target_version,
      :imported_data,
      :current_data,
      :expires_at
    ])
    |> validate_inclusion(:status, ~w(preparing ready failed applied expired))
  end
end
