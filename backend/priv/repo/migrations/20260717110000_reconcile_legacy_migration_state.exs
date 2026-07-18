defmodule MinhaCasaAi.Repo.Migrations.ReconcileLegacyMigrationState do
  use Ecto.Migration

  def up do
    path = Application.app_dir(:minha_casa_ai, "priv/repo/baseline/100_reconcile.sql")

    path
    |> File.read!()
    |> String.split("-- migrate:split")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end

  def down do
    raise "legacy migration reconciliation is intentionally irreversible"
  end
end
