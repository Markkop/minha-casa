defmodule MinhaCasaAi.Repo.Migrations.RemoveLegacyTestPlusPlans do
  use Ecto.Migration

  def up do
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
