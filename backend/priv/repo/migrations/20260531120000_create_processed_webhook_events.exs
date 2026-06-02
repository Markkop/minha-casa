defmodule MinhaCasaAi.Repo.Migrations.CreateProcessedWebhookEvents do
  use Ecto.Migration

  def change do
    execute("""
    CREATE TABLE IF NOT EXISTS processed_webhook_events (
      id text PRIMARY KEY,
      event_type text NOT NULL,
      processed_at timestamptz NOT NULL DEFAULT now()
    )
    """)

    execute(
      "CREATE INDEX IF NOT EXISTS processed_webhook_events_type_idx ON processed_webhook_events (event_type)"
    )

    execute(
      "CREATE INDEX IF NOT EXISTS processed_webhook_events_processed_at_idx ON processed_webhook_events (processed_at)"
    )
  end
end
