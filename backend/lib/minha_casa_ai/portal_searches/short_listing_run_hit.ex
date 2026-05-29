defmodule MinhaCasaAi.PortalSearches.ShortListingRunHit do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  schema "short_listing_run_hits" do
    field :portal_search_run_id, :binary_id, primary_key: true
    field :short_listing_id, :binary_id, primary_key: true
    field :portal_search_target_id, :binary_id
    field :rank, :integer
    field :cache_origin, :string, default: "fresh"
  end

  def changeset(hit, attrs) do
    hit
    |> cast(attrs, [:portal_search_run_id, :short_listing_id, :portal_search_target_id, :rank, :cache_origin])
    |> validate_required([:portal_search_run_id, :short_listing_id, :portal_search_target_id, :cache_origin])
    |> validate_inclusion(:cache_origin, ~w(fresh page_cache listing_cache))
  end
end
