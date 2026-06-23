defmodule MinhaCasaAi.Repo.Migrations.CreateFinanceiroSharedSnapshots do
  use Ecto.Migration

  def change do
    create table(:financeiro_shared_snapshots, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:token, :text, null: false)
      add(:user_id, references(:users, type: :uuid, on_delete: :delete_all))
      add(:org_id, references(:organizations, type: :uuid, on_delete: :delete_all))
      add(:title, :text, null: false)
      add(:payload, :map, null: false, default: %{})
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:financeiro_shared_snapshots, [:token]))
    create(index(:financeiro_shared_snapshots, [:user_id]))
    create(index(:financeiro_shared_snapshots, [:org_id]))

    create(
      constraint(:financeiro_shared_snapshots, :financeiro_shared_snapshots_owner_check,
        check:
          "(user_id IS NOT NULL AND org_id IS NULL) OR (user_id IS NULL AND org_id IS NOT NULL)"
      )
    )
  end
end
