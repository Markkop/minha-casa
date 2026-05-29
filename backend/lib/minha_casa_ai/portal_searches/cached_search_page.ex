defmodule MinhaCasaAi.PortalSearches.CachedSearchPage do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "cached_search_pages" do
    field :portal, :string
    field :canonical_url, :string
    field :raw_text, :string
    field :scraped_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :scrapingant_credits, :integer
    field :extracted_at, :utc_datetime_usec
    field :extraction_status, :string, default: "pending"
    field :hermes_run_id, :string
    field :card_count, :integer, default: 0
    field :source_urls, {:array, :string}, default: []

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(page, attrs) do
    page
    |> cast(attrs, [
      :portal,
      :canonical_url,
      :raw_text,
      :scraped_at,
      :expires_at,
      :scrapingant_credits,
      :extracted_at,
      :extraction_status,
      :hermes_run_id,
      :card_count,
      :source_urls
    ])
    |> validate_required([:portal, :canonical_url])
  end
end
