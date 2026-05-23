defmodule MinhaCasaAi.Repo.Migrations.CreateWhatsappLinkingTables do
  use Ecto.Migration

  def change do
    create table(:whatsapp_link_codes, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:code, :text, null: false)
      add(:wa_id, :text, null: false)
      add(:phone, :text)
      add(:status, :text, null: false, default: "pending")
      add(:expires_at, :utc_datetime, null: false)
      add(:consumed_by_user_id, :uuid)
      timestamps(type: :utc_datetime, updated_at: false)
    end

    create(unique_index(:whatsapp_link_codes, [:code]))
    create(index(:whatsapp_link_codes, [:wa_id]))

    create table(:whatsapp_identities, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:wa_id, :text, null: false)
      add(:user_id, :uuid, null: false)
      add(:phone, :text)
      add(:linked_at, :utc_datetime, null: false)
    end

    create(unique_index(:whatsapp_identities, [:wa_id]))
    create(index(:whatsapp_identities, [:user_id]))
  end
end
