defmodule MinhaCasaAi.Repo.Migrations.NormalizeFamilyAgencyNames do
  use Ecto.Migration

  def up do
    execute("""
    UPDATE organizations
    SET name = 'Família', updated_at = NOW()
    WHERE kind = 'family' AND name <> 'Família'
    """)

    execute("""
    UPDATE organizations
    SET name = 'Imobiliária', updated_at = NOW()
    WHERE kind = 'agency'
      AND LOWER(BTRIM(name)) IN (
        'organizacao',
        'organização',
        'organization',
        'imobiliaria',
        'imobiliária'
      )
    """)

    execute("""
    UPDATE workspaces AS workspace
    SET name = organization.name, updated_at = NOW()
    FROM organizations AS organization
    WHERE workspace.id = organization.workspace_id
      AND workspace.name IS DISTINCT FROM organization.name
    """)
  end

  def down, do: :ok
end
