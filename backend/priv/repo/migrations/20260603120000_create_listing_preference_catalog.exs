defmodule MinhaCasaAi.Repo.Migrations.CreateListingPreferenceCatalog do
  use Ecto.Migration

  def change do
    create table(:listing_preference_catalog, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:user_id, references(:users, type: :uuid, on_delete: :delete_all))
      add(:org_id, references(:organizations, type: :uuid, on_delete: :delete_all))
      add(:key, :text, null: false)
      add(:label, :text, null: false)
      add(:source, :text, null: false, default: "custom")
      add(:visible, :boolean, null: false, default: true)
      add(:sort_order, :integer, null: false, default: 0)
      add(:legacy_key, :text)
      timestamps(type: :utc_datetime, inserted_at: :created_at, updated_at: :updated_at)
    end

    create(
      constraint(:listing_preference_catalog, :listing_preference_catalog_owner_check,
        check:
          "(user_id IS NOT NULL AND org_id IS NULL) OR (user_id IS NULL AND org_id IS NOT NULL)"
      )
    )

    create(
      constraint(:listing_preference_catalog, :listing_preference_catalog_source_check,
        check: "source IN ('system', 'custom')"
      )
    )

    create(index(:listing_preference_catalog, [:user_id]))
    create(index(:listing_preference_catalog, [:org_id]))

    create(
      unique_index(:listing_preference_catalog, [:user_id, :key],
        name: :listing_preference_catalog_user_key_idx,
        where: "org_id IS NULL"
      )
    )

    create(
      unique_index(:listing_preference_catalog, [:org_id, :key],
        name: :listing_preference_catalog_org_key_idx,
        where: "user_id IS NULL"
      )
    )
  end
end
