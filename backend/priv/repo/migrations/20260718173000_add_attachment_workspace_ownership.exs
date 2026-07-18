defmodule MinhaCasaAi.Repo.Migrations.AddAttachmentWorkspaceOwnership do
  use Ecto.Migration

  def up do
    alter table(:ai_attachments) do
      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :delete_all))
    end

    execute("""
    UPDATE ai_attachments AS attachment
       SET workspace_id = organization.workspace_id
      FROM organizations AS organization
     WHERE attachment.workspace_id IS NULL
       AND attachment.org_id = organization.id
    """)

    execute("""
    UPDATE ai_attachments AS attachment
       SET workspace_id = workspace.id
      FROM workspaces AS workspace
     WHERE attachment.workspace_id IS NULL
       AND attachment.user_id = workspace.owner_user_id
       AND workspace.type = 'personal'
    """)

    execute("""
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM ai_attachments WHERE workspace_id IS NULL) THEN
        RAISE EXCEPTION
          'ai_attachments contains rows without an organization or personal workspace owner';
      END IF;
    END
    $$
    """)

    alter table(:ai_attachments) do
      modify(:workspace_id, :uuid, null: false)
    end

    create(index(:ai_attachments, [:workspace_id, :inserted_at]))
  end

  def down do
    drop(index(:ai_attachments, [:workspace_id, :inserted_at]))

    alter table(:ai_attachments) do
      remove(:workspace_id)
    end
  end
end
