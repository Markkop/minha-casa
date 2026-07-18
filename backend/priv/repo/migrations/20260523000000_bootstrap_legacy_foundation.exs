defmodule MinhaCasaAi.Repo.Migrations.BootstrapLegacyFoundation do
  use Ecto.Migration

  @baseline_dir "priv/repo/baseline"

  def up do
    # This version must precede the historical Ecto migrations: several of them
    # reference tables that were originally created only by Drizzle. Keeping the
    # bootstrap in Ecto makes a fresh database runnable through one migrator.
    execute_asset!("000_validate_existing.sql")
    execute_asset!("010_auth.sql")
    execute_asset!("020_billing_and_ownership.sql")
    execute_asset!("030_decision_data.sql")
  end

  def down do
    raise "the legacy foundation bootstrap is intentionally irreversible"
  end

  defp asset!(name) do
    :minha_casa_ai
    |> Application.app_dir(Path.join(@baseline_dir, name))
    |> File.read!()
  end

  defp execute_asset!(name) do
    name
    |> asset!()
    |> String.split("-- migrate:split")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.each(&execute/1)
  end
end
