defmodule MinhaCasaAi.Repo.Migrations.CreateOrganizationInvites do
  use Ecto.Migration

  def change do
    create table(:organization_invites, primary_key: false) do
      add(:id, :uuid, primary_key: true)
      add(:org_id, references(:organizations, type: :uuid, on_delete: :delete_all), null: false)
      add(:token, :text, null: false)
      add(:role, :text, null: false)
      add(:status, :text, null: false, default: "pending")
      add(:created_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:accepted_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:expires_at, :utc_datetime, null: false)
      add(:accepted_at, :utc_datetime)
      add(:revoked_at, :utc_datetime)
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:organization_invites, [:token]))
    create(index(:organization_invites, [:org_id]))
    create(index(:organization_invites, [:created_by_user_id]))
    create(index(:organization_invites, [:accepted_by_user_id]))

    create(
      constraint(:organization_invites, :organization_invites_role_check,
        check: "role IN ('owner', 'admin', 'member')"
      )
    )

    create(
      constraint(:organization_invites, :organization_invites_status_check,
        check: "status IN ('pending', 'accepted', 'revoked')"
      )
    )
  end
end
