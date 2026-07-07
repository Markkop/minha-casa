defmodule MinhaCasaAi.Repo.Migrations.CreateFinanceiroScenarios do
  use Ecto.Migration

  def change do
    create table(:financeiro_scenarios, primary_key: false) do
      add(:id, :uuid, primary_key: true)

      add(:collection_id, references(:collections, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:name, :text, null: false)
      add(:payload, :map, null: false, default: %{})
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(index(:financeiro_scenarios, [:collection_id]))
    create(index(:financeiro_scenarios, [:collection_id, :created_at]))
  end
end
