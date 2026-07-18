defmodule MinhaCasaAi.Repo.Migrations.AdoptCanonicalBaseline do
  use Ecto.Migration

  def up do
    # By this point both the foundation bootstrap and the historical Ecto chain
    # have run on a fresh database. Existing databases are adopted only if they
    # expose the same complete pre-workspace contract.
    path = Application.app_dir(:minha_casa_ai, "priv/repo/baseline/000_validate_existing.sql")
    execute(File.read!(path))
  end

  def down do
    raise "the canonical baseline is an irreversible adoption migration"
  end
end
