defmodule MinhaCasaAi.Repo.Migrations.WorkspaceOwnedResources do
  use Ecto.Migration

  @tables ~w(contacts regions condominiums saved_links listing_preference_catalog
             chat_conversations portal_searches ai_workflow_runs)a

  def up do
    Enum.each(@tables, fn table_name ->
      alter table(table_name) do
        add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :restrict))
      end

      execute("""
      UPDATE #{table_name} r
         SET workspace_id = w.id
        FROM workspaces w
       WHERE r.workspace_id IS NULL
         AND r.user_id IS NOT NULL
         AND w.type = 'personal'
         AND w.owner_user_id = r.user_id
      """)

      execute("""
      UPDATE #{table_name} r
         SET workspace_id = o.workspace_id
        FROM organizations o
       WHERE r.workspace_id IS NULL
         AND r.org_id = o.id
      """)

      alter table(table_name) do
        modify(:workspace_id, :uuid, null: false)
      end

      create(index(table_name, [:workspace_id]))
    end)
  end

  def down do
    Enum.each(Enum.reverse(@tables), fn table_name ->
      alter table(table_name) do
        remove(:workspace_id)
      end
    end)
  end
end
