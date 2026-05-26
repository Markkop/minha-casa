defmodule MinhaCasaAi.Repo.Migrations.CreateListingAnalyses do
  use Ecto.Migration

  def change do
    create table(:listing_analyses, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:listing_id, references(:listings, type: :uuid, on_delete: :delete_all), null: false)
      add(:workflow_run_id, references(:ai_workflow_runs, type: :uuid, on_delete: :nilify_all))
      add(:user_id, references(:users, type: :uuid, on_delete: :delete_all))
      add(:org_id, references(:organizations, type: :uuid, on_delete: :delete_all))
      add(:status, :text, null: false, default: "queued")
      add(:input, :map, null: false, default: %{})
      add(:result, :map)
      add(:error, :text)
      timestamps(inserted_at: :created_at, type: :utc_datetime)
    end

    create(index(:listing_analyses, [:listing_id]))
    create(index(:listing_analyses, [:user_id]))
    create(index(:listing_analyses, [:org_id]))
    create(index(:listing_analyses, [:status]))
    create(index(:listing_analyses, [:listing_id, :status]))
  end
end
