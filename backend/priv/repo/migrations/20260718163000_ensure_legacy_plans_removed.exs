defmodule MinhaCasaAi.Repo.Migrations.EnsureLegacyPlansRemoved do
  use Ecto.Migration

  def up do
    # Existing installations may adopt the early foundation after the original
    # cleanup migration was already recorded. Reassert the canonical plan set in
    # a forward migration so those installations cannot retain reintroduced rows.
    execute("""
    DELETE FROM subscriptions
     WHERE plan_id IN (SELECT id FROM plans WHERE slug IN ('teste', 'plus'))
    """)

    execute("DELETE FROM plans WHERE slug IN ('teste', 'plus')")
  end

  def down do
    :ok
  end
end
