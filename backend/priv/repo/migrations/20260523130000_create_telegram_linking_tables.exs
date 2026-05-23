defmodule MinhaCasaAi.Repo.Migrations.CreateTelegramLinkingTables do
  use Ecto.Migration

  def change do
    create table(:telegram_link_codes, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:code, :text, null: false)
      add(:chat_id, :text, null: false)
      add(:telegram_user_id, :text)
      add(:status, :text, null: false, default: "pending")
      add(:expires_at, :utc_datetime, null: false)
      add(:consumed_by_user_id, :uuid)
      timestamps(type: :utc_datetime, updated_at: false)
    end

    create(unique_index(:telegram_link_codes, [:code]))
    create(index(:telegram_link_codes, [:chat_id]))

    create table(:telegram_identities, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:chat_id, :text, null: false)
      add(:user_id, :uuid, null: false)
      add(:telegram_user_id, :text)
      add(:linked_at, :utc_datetime, null: false)
    end

    create(unique_index(:telegram_identities, [:chat_id]))
    create(index(:telegram_identities, [:user_id]))

    create table(:telegram_events, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:provider_event_id, :text, null: false)
      add(:payload, :map, null: false)
      add(:status, :text, null: false, default: "received")
      add(:error, :text)
      timestamps(type: :utc_datetime)
    end

    create(unique_index(:telegram_events, [:provider_event_id]))
    create(index(:telegram_events, [:status]))
  end
end
