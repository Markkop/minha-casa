defmodule MinhaCasaAi.Repo.Migrations.CreatePortalSearchTables do
  use Ecto.Migration

  def change do
    create table(:portal_searches, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:user_id, :binary_id)
      add(:org_id, :binary_id)
      add(:name, :string, null: false)
      add(:filter_set, :map, null: false, default: %{})
      add(:enabled_portals, {:array, :string}, null: false, default: [])
      add(:max_pages, :integer, null: false, default: 1)
      add(:last_run_id, :binary_id)

      timestamps(type: :utc_datetime_usec)
    end

    create(index(:portal_searches, [:user_id]))
    create(index(:portal_searches, [:org_id]))

    create table(:portal_search_runs, primary_key: false) do
      add(:id, :binary_id, primary_key: true)

      add(
        :portal_search_id,
        references(:portal_searches, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:status, :string, null: false, default: "queued")
      add(:started_at, :utc_datetime_usec)
      add(:finished_at, :utc_datetime_usec)
      add(:error, :text)
      add(:totals, :map, default: %{})
      add(:trace_id, :string)
      add(:refresh, :boolean, default: false, null: false)

      timestamps(type: :utc_datetime_usec)
    end

    create(index(:portal_search_runs, [:portal_search_id]))
    create(index(:portal_search_runs, [:status]))

    create table(:cached_search_pages, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:portal, :string, null: false)
      add(:canonical_url, :text, null: false)
      add(:raw_text, :text)
      add(:scraped_at, :utc_datetime_usec)
      add(:expires_at, :utc_datetime_usec)
      add(:scrapingant_credits, :integer)
      add(:extracted_at, :utc_datetime_usec)
      add(:extraction_status, :string, default: "pending")
      add(:hermes_run_id, :string)
      add(:card_count, :integer, default: 0)
      add(:source_urls, {:array, :string}, default: [])

      timestamps(type: :utc_datetime_usec)
    end

    create(unique_index(:cached_search_pages, [:portal, :canonical_url]))
    create(index(:cached_search_pages, [:expires_at]))

    create table(:portal_search_targets, primary_key: false) do
      add(:id, :binary_id, primary_key: true)

      add(
        :portal_search_run_id,
        references(:portal_search_runs, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:portal, :string, null: false)
      add(:bairro_slug, :string)
      add(:page, :integer, null: false, default: 1)
      add(:url, :text, null: false)
      add(:canonical_url, :text, null: false)

      add(
        :cached_search_page_id,
        references(:cached_search_pages, type: :binary_id, on_delete: :nilify_all)
      )

      add(:status, :string, null: false, default: "queued")
      add(:cards_count, :integer, default: 0)
      add(:cache_hit, :boolean, default: false, null: false)
      add(:error, :text)
      add(:started_at, :utc_datetime_usec)
      add(:finished_at, :utc_datetime_usec)

      timestamps(type: :utc_datetime_usec)
    end

    create(index(:portal_search_targets, [:portal_search_run_id]))
    create(index(:portal_search_targets, [:status]))

    create table(:short_listings, primary_key: false) do
      add(:id, :binary_id, primary_key: true)
      add(:portal, :string, null: false)
      add(:source_url, :text, null: false)
      add(:title, :text)
      add(:bairro, :string)
      add(:cidade, :string)
      add(:uf, :string)
      add(:tipo_imovel, :string)
      add(:quartos, :integer)
      add(:banheiros, :integer)
      add(:vagas, :integer)
      add(:suites, :integer)
      add(:area_total, :float)
      add(:area_privada, :float)
      add(:preco, :float)
      add(:preco_condominio, :float)
      add(:preco_m2, :float)
      add(:amenidades, {:array, :string}, default: [])
      add(:thumbnail_url, :text)
      add(:posted_at, :utc_datetime_usec)
      add(:raw_card, :map, default: %{})
      add(:first_seen_at, :utc_datetime_usec)
      add(:last_seen_at, :utc_datetime_usec)
      add(:last_extracted_at, :utc_datetime_usec)
      add(:expires_at, :utc_datetime_usec)

      timestamps(type: :utc_datetime_usec)
    end

    create(unique_index(:short_listings, [:portal, :source_url]))
    create(index(:short_listings, [:portal, :bairro, :quartos]))
    create(index(:short_listings, [:cidade, :uf]))
    create(index(:short_listings, [:expires_at]))

    create table(:short_listing_run_hits, primary_key: false) do
      add(
        :portal_search_run_id,
        references(:portal_search_runs, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(
        :short_listing_id,
        references(:short_listings, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(
        :portal_search_target_id,
        references(:portal_search_targets, type: :binary_id, on_delete: :delete_all),
        null: false
      )

      add(:rank, :integer)
      add(:cache_origin, :string, null: false, default: "fresh")
    end

    create(unique_index(:short_listing_run_hits, [:portal_search_run_id, :short_listing_id]))
    create(index(:short_listing_run_hits, [:portal_search_target_id]))
  end
end
