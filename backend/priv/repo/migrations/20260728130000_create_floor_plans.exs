defmodule MinhaCasaAi.Repo.Migrations.CreateFloorPlans do
  use Ecto.Migration

  def change do
    create table(:floor_plans, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))

      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:listing_id, references(:listings, type: :uuid, on_delete: :delete_all), null: false)

      add(
        :created_by_user_id,
        references(:users, type: :uuid, on_delete: :nilify_all)
      )

      add(:name, :text, null: false)
      add(:document, :map, null: false, default: %{"version" => 2})
      add(:revision, :integer, null: false, default: 0)
      add(:blueprint_storage_key, :text)
      add(:blueprint_content_type, :text)
      add(:blueprint_byte_size, :integer)
      add(:blueprint_width, :integer)
      add(:blueprint_height, :integer)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(index(:floor_plans, [:workspace_id, :created_at]))
    create(index(:floor_plans, [:listing_id, :created_at]))

    create(constraint(:floor_plans, :floor_plans_revision_non_negative, check: "revision >= 0"))

    create(
      constraint(:floor_plans, :floor_plans_blueprint_metadata_complete,
        check: """
        (blueprint_storage_key IS NULL AND blueprint_content_type IS NULL AND blueprint_byte_size IS NULL)
        OR
        (blueprint_storage_key IS NOT NULL AND blueprint_content_type IS NOT NULL AND blueprint_byte_size IS NOT NULL)
        """
      )
    )

    create(
      constraint(:floor_plans, :floor_plans_blueprint_content_type,
        check:
          "blueprint_content_type IS NULL OR blueprint_content_type IN ('image/png', 'image/jpeg', 'image/webp')"
      )
    )

    create table(:floor_plan_area_links, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))

      add(:floor_plan_id, references(:floor_plans, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(
        :environment_id,
        references(:listing_environments, type: :uuid, on_delete: :nilify_all)
      )

      add(:shape_id, :text, null: false)
      add(:custom_name, :text)
      add(:inherited_name_snapshot, :text)

      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:floor_plan_area_links, [:floor_plan_id, :shape_id]))
    create(index(:floor_plan_area_links, [:environment_id]))

    execute(
      """
      CREATE FUNCTION sync_floor_plan_environment_name() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name THEN
          UPDATE floor_plan_area_links
             SET inherited_name_snapshot = NEW.name,
                 updated_at = now()
           WHERE environment_id = NEW.id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE floor_plan_area_links
             SET custom_name = COALESCE(custom_name, OLD.name),
                 inherited_name_snapshot = OLD.name,
                 environment_id = NULL,
                 updated_at = now()
           WHERE environment_id = OLD.id;
          RETURN OLD;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      """,
      """
      DROP FUNCTION IF EXISTS sync_floor_plan_environment_name();
      """
    )

    execute(
      """
      CREATE TRIGGER listing_environments_sync_floor_plan_names
      BEFORE UPDATE OF name OR DELETE ON listing_environments
      FOR EACH ROW EXECUTE FUNCTION sync_floor_plan_environment_name();
      """,
      """
      DROP TRIGGER IF EXISTS listing_environments_sync_floor_plan_names ON listing_environments;
      """
    )
  end
end
