defmodule MinhaCasaAi.Repo.Migrations.RemoveAddons do
  use Ecto.Migration

  def up do
    drop_if_exists(table(:organization_addons))
    drop_if_exists(table(:user_addons))
    drop_if_exists(table(:addons))
  end

  def down do
    raise "addon removal is intentionally irreversible"
  end
end
