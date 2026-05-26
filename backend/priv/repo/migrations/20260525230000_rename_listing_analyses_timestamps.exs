defmodule MinhaCasaAi.Repo.Migrations.RenameListingAnalysesTimestamps do
  use Ecto.Migration

  def up do
    execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'listing_analyses'
          AND column_name = 'inserted_at'
      ) THEN
        ALTER TABLE listing_analyses RENAME COLUMN inserted_at TO created_at;
      END IF;
    END
    $$;
    """)
  end

  def down do
    execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'listing_analyses'
          AND column_name = 'created_at'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'listing_analyses'
          AND column_name = 'inserted_at'
      ) THEN
        ALTER TABLE listing_analyses RENAME COLUMN created_at TO inserted_at;
      END IF;
    END
    $$;
    """)
  end
end
