defmodule MinhaCasaAi.Repo.Migrations.CreateListingShortLinks do
  use Ecto.Migration

  def change do
    create table(:listing_short_links, primary_key: false) do
      add(:short_id, :text, primary_key: true, null: false)
      add(:listing_id, references(:listings, type: :uuid, on_delete: :delete_all), null: false)
      add(:collection_id, references(:collections, type: :uuid, on_delete: :delete_all), null: false)
      timestamps(inserted_at: :created_at, updated_at: false, type: :utc_datetime)
    end

    create(unique_index(:listing_short_links, [:listing_id]))
    create(index(:listing_short_links, [:collection_id]))
  end
end
