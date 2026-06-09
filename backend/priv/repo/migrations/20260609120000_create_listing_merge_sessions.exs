defmodule MinhaCasaAi.Repo.Migrations.CreateListingMergeSessions do
  use Ecto.Migration

  def change do
    create table(:listing_merge_sessions, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:user_id, :uuid)
      add(:org_id, :uuid)

      add(:collection_id, references(:collections, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:target_listing_id, references(:listings, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:status, :text, null: false, default: "preparing")
      add(:target_version, :text, null: false)
      add(:imported_data, :map, null: false, default: %{})
      add(:current_data, :map, null: false, default: %{})
      add(:payload, :map, null: false, default: %{})
      add(:error, :text)
      add(:expires_at, :utc_datetime, null: false)
      add(:applied_at, :utc_datetime)
      timestamps(type: :utc_datetime)
    end

    create(index(:listing_merge_sessions, [:user_id, :status]))
    create(index(:listing_merge_sessions, [:org_id, :status]))
    create(index(:listing_merge_sessions, [:target_listing_id]))
    create(index(:listing_merge_sessions, [:expires_at]))
  end
end
