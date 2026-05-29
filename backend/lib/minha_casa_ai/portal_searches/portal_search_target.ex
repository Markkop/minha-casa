defmodule MinhaCasaAi.PortalSearches.PortalSearchTarget do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "portal_search_targets" do
    field :portal_search_run_id, :binary_id
    field :portal, :string
    field :bairro_slug, :string
    field :page, :integer, default: 1
    field :url, :string
    field :canonical_url, :string
    field :cached_search_page_id, :binary_id
    field :status, :string, default: "queued"
    field :cards_count, :integer, default: 0
    field :cache_hit, :boolean, default: false
    field :error, :string
    field :started_at, :utc_datetime_usec
    field :finished_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(target, attrs) do
    target
    |> cast(attrs, [
      :portal_search_run_id,
      :portal,
      :bairro_slug,
      :page,
      :url,
      :canonical_url,
      :cached_search_page_id,
      :status,
      :cards_count,
      :cache_hit,
      :error,
      :started_at,
      :finished_at
    ])
    |> validate_required([:portal_search_run_id, :portal, :page, :url, :canonical_url, :status])
    |> validate_inclusion(:status, ~w(queued running completed failed))
  end
end
