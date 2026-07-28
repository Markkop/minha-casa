defmodule MinhaCasaAi.Repo.Migrations.NormalizeListingImagesAndEnvironments do
  use Ecto.Migration

  def up do
    create table(:listing_images, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))
      add(:listing_id, references(:listings, type: :uuid, on_delete: :delete_all), null: false)
      add(:source_url, :text)
      add(:storage_key, :text)
      add(:fingerprint, :map)
      add(:position, :integer, null: false)
      add(:is_cover, :boolean, null: false, default: false)
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:listing_images, [:listing_id, :position]))
    create(index(:listing_images, [:listing_id]))
    create(index(:listing_images, [:storage_key]))

    create(
      constraint(:listing_images, :listing_images_source_check,
        check:
          "NULLIF(btrim(source_url), '') IS NOT NULL OR NULLIF(btrim(storage_key), '') IS NOT NULL OR fingerprint IS NOT NULL"
      )
    )

    execute(
      "CREATE UNIQUE INDEX listing_images_one_cover_idx ON listing_images (listing_id) WHERE is_cover",
      "DROP INDEX listing_images_one_cover_idx"
    )

    create table(:listing_environments, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))
      add(:listing_id, references(:listings, type: :uuid, on_delete: :delete_all), null: false)
      add(:kind, :text, null: false)
      add(:name, :text, null: false)
      add(:ordinal, :integer)
      add(:position, :integer, null: false)
      add(:source, :text, null: false, default: "manual")
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:listing_environments, [:listing_id, :position]))
    create(index(:listing_environments, [:listing_id]))

    create(
      constraint(:listing_environments, :listing_environments_kind_check,
        check:
          "kind IN ('exterior','livingRoom','kitchen','bedroom','bathroom','garage','balcony','utilityRoom','custom')"
      )
    )

    create(
      constraint(:listing_environments, :listing_environments_source_check,
        check: "source IN ('manual')"
      )
    )

    create table(:listing_environment_images, primary_key: false) do
      add(
        :environment_id,
        references(:listing_environments, type: :uuid, on_delete: :delete_all),
        primary_key: true,
        null: false
      )

      add(
        :image_id,
        references(:listing_images, type: :uuid, on_delete: :delete_all),
        primary_key: true,
        null: false
      )

      add(:position, :integer, null: false)
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:listing_environment_images, [:image_id]))
    create(unique_index(:listing_environment_images, [:environment_id, :position]))

    execute("""
    DO $$
    DECLARE
      listing_row record;
      environment_value jsonb;
      image_index_value jsonb;
      image_count integer;
      image_position integer;
      cover_position integer;
      environment_position integer;
      environment_image_position integer;
      environment_id uuid;
      image_id uuid;
      environment_kind text;
      environment_name text;
      environment_ordinal integer;
      bedrooms_count integer;
      bathrooms_count integer;
      parking_count integer;
      default_position integer;
      default_ordinal integer;
    BEGIN
      FOR listing_row IN SELECT id, data FROM listings ORDER BY created_at, id LOOP
        image_count := GREATEST(
          CASE WHEN jsonb_typeof(listing_row.data -> 'imageUrls') = 'array'
            THEN jsonb_array_length(listing_row.data -> 'imageUrls') ELSE 0 END,
          CASE WHEN jsonb_typeof(listing_row.data -> 'imageStorageKeys') = 'array'
            THEN jsonb_array_length(listing_row.data -> 'imageStorageKeys') ELSE 0 END
        );

        IF image_count = 0 AND jsonb_typeof(listing_row.data -> 'imageUrl') = 'string' AND
           btrim(listing_row.data ->> 'imageUrl') <> '' THEN
          image_count := 1;
        END IF;

        cover_position := CASE
          WHEN COALESCE(listing_row.data ->> 'coverImageIndex', '') ~ '^\d+$'
            AND (listing_row.data ->> 'coverImageIndex')::integer < image_count
            THEN (listing_row.data ->> 'coverImageIndex')::integer
          ELSE 0
        END;

        IF image_count > 0 THEN
          FOR image_position IN 0..(image_count - 1) LOOP
            INSERT INTO listing_images (
              id, listing_id, source_url, storage_key, fingerprint, position, is_cover,
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(),
              listing_row.id,
              COALESCE(
                CASE WHEN jsonb_typeof(listing_row.data -> 'imageUrls') = 'array'
                  AND image_position < jsonb_array_length(listing_row.data -> 'imageUrls')
                  AND jsonb_typeof(listing_row.data -> 'imageUrls' -> image_position) = 'string'
                  THEN listing_row.data -> 'imageUrls' ->> image_position END,
                CASE WHEN image_position = 0 AND jsonb_typeof(listing_row.data -> 'imageUrl') = 'string'
                  THEN listing_row.data ->> 'imageUrl' END
              ),
              CASE WHEN jsonb_typeof(listing_row.data -> 'imageStorageKeys') = 'array'
                AND image_position < jsonb_array_length(listing_row.data -> 'imageStorageKeys')
                AND jsonb_typeof(listing_row.data -> 'imageStorageKeys' -> image_position) = 'string'
                THEN listing_row.data -> 'imageStorageKeys' ->> image_position END,
              CASE WHEN jsonb_typeof(listing_row.data -> 'imageFingerprints') = 'array'
                AND image_position < jsonb_array_length(listing_row.data -> 'imageFingerprints')
                AND jsonb_typeof(listing_row.data -> 'imageFingerprints' -> image_position) = 'object'
                THEN listing_row.data -> 'imageFingerprints' -> image_position END,
              image_position,
              image_position = cover_position,
              now(), now()
            );
          END LOOP;
        END IF;

        IF jsonb_typeof(listing_row.data -> 'imageEnvironments') = 'array' AND
           jsonb_array_length(listing_row.data -> 'imageEnvironments') > 0 THEN
          environment_position := 0;

          FOR environment_value IN
            SELECT value FROM jsonb_array_elements(listing_row.data -> 'imageEnvironments')
          LOOP
            IF jsonb_typeof(environment_value) = 'object' THEN
              environment_id := CASE
                WHEN COALESCE(environment_value ->> 'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  AND NOT EXISTS (
                    SELECT 1 FROM listing_environments WHERE id = (environment_value ->> 'id')::uuid
                  )
                  THEN (environment_value ->> 'id')::uuid
                ELSE gen_random_uuid()
              END;

              environment_kind := CASE environment_value ->> 'kind'
                WHEN 'areaExterna' THEN 'exterior'
                WHEN 'sala' THEN 'livingRoom'
                WHEN 'cozinha' THEN 'kitchen'
                WHEN 'quarto' THEN 'bedroom'
                WHEN 'banheiro' THEN 'bathroom'
                WHEN 'garagem' THEN 'garage'
                WHEN 'varanda' THEN 'balcony'
                WHEN 'areaServico' THEN 'utilityRoom'
                WHEN 'exterior' THEN 'exterior'
                WHEN 'livingRoom' THEN 'livingRoom'
                WHEN 'kitchen' THEN 'kitchen'
                WHEN 'bedroom' THEN 'bedroom'
                WHEN 'bathroom' THEN 'bathroom'
                WHEN 'garage' THEN 'garage'
                WHEN 'balcony' THEN 'balcony'
                WHEN 'utilityRoom' THEN 'utilityRoom'
                ELSE 'custom'
              END;

              environment_name := NULLIF(btrim(COALESCE(
                environment_value ->> 'name', environment_value ->> 'label'
              )), '');

              environment_name := COALESCE(environment_name, CASE environment_kind
                WHEN 'exterior' THEN 'Área externa'
                WHEN 'livingRoom' THEN 'Sala'
                WHEN 'kitchen' THEN 'Cozinha'
                WHEN 'bedroom' THEN 'Quarto'
                WHEN 'bathroom' THEN 'Banheiro'
                WHEN 'garage' THEN 'Garagem'
                WHEN 'balcony' THEN 'Varanda'
                WHEN 'utilityRoom' THEN 'Área de serviço'
                ELSE 'Outro'
              END);

              environment_ordinal := CASE
                WHEN COALESCE(environment_value ->> 'ordinal', '') ~ '^\d+$'
                  THEN (environment_value ->> 'ordinal')::integer
                ELSE NULL
              END;

              INSERT INTO listing_environments (
                id, listing_id, kind, name, ordinal, position, source, created_at, updated_at
              ) VALUES (
                environment_id, listing_row.id, environment_kind, environment_name,
                environment_ordinal, environment_position, 'manual', now(), now()
              );

              environment_image_position := 0;
              IF jsonb_typeof(environment_value -> 'imageIndices') = 'array' THEN
                FOR image_index_value IN
                  SELECT value FROM jsonb_array_elements(environment_value -> 'imageIndices')
                LOOP
                  IF jsonb_typeof(image_index_value) = 'number' AND
                     (image_index_value #>> '{}') ~ '^\d+$' AND
                     (image_index_value #>> '{}')::integer < image_count THEN
                    SELECT id INTO image_id
                    FROM listing_images
                    WHERE listing_id = listing_row.id
                      AND position = (image_index_value #>> '{}')::integer;

                    IF image_id IS NOT NULL THEN
                      INSERT INTO listing_environment_images (
                        environment_id, image_id, position, created_at, updated_at
                      ) VALUES (
                        environment_id, image_id, environment_image_position, now(), now()
                      ) ON CONFLICT (image_id) DO NOTHING;

                      IF FOUND THEN
                        environment_image_position := environment_image_position + 1;
                      END IF;
                    END IF;
                  END IF;
                END LOOP;
              END IF;

              environment_position := environment_position + 1;
            END IF;
          END LOOP;
        ELSE
          bedrooms_count := CASE WHEN COALESCE(listing_row.data ->> 'bedrooms', '') ~ '^\d+(\.0+)?$'
            THEN GREATEST(0, floor((listing_row.data ->> 'bedrooms')::numeric)::integer) ELSE 0 END;
          bathrooms_count := CASE WHEN COALESCE(listing_row.data ->> 'bathrooms', '') ~ '^\d+(\.0+)?$'
            THEN GREATEST(0, floor((listing_row.data ->> 'bathrooms')::numeric)::integer) ELSE 0 END;
          parking_count := CASE WHEN COALESCE(listing_row.data ->> 'parkingSpots', '') ~ '^\d+(\.0+)?$'
            THEN GREATEST(0, floor((listing_row.data ->> 'parkingSpots')::numeric)::integer) ELSE 0 END;

          default_position := 0;
          INSERT INTO listing_environments (listing_id, kind, name, position, source, created_at, updated_at)
          VALUES (listing_row.id, 'exterior', 'Área externa', default_position, 'manual', now(), now());
          default_position := default_position + 1;
          INSERT INTO listing_environments (listing_id, kind, name, position, source, created_at, updated_at)
          VALUES (listing_row.id, 'livingRoom', 'Sala', default_position, 'manual', now(), now());
          default_position := default_position + 1;
          INSERT INTO listing_environments (listing_id, kind, name, position, source, created_at, updated_at)
          VALUES (listing_row.id, 'kitchen', 'Cozinha', default_position, 'manual', now(), now());
          default_position := default_position + 1;

          IF bedrooms_count > 0 THEN
            FOR default_ordinal IN 1..bedrooms_count LOOP
              INSERT INTO listing_environments (listing_id, kind, name, ordinal, position, source, created_at, updated_at)
              VALUES (listing_row.id, 'bedroom', 'Quarto ' || default_ordinal, default_ordinal, default_position, 'manual', now(), now());
              default_position := default_position + 1;
            END LOOP;
          END IF;

          IF bathrooms_count > 0 THEN
            FOR default_ordinal IN 1..bathrooms_count LOOP
              INSERT INTO listing_environments (listing_id, kind, name, ordinal, position, source, created_at, updated_at)
              VALUES (listing_row.id, 'bathroom', 'Banheiro ' || default_ordinal, default_ordinal, default_position, 'manual', now(), now());
              default_position := default_position + 1;
            END LOOP;
          END IF;

          IF parking_count > 0 THEN
            INSERT INTO listing_environments (listing_id, kind, name, position, source, created_at, updated_at)
            VALUES (listing_row.id, 'garage', 'Garagem', default_position, 'manual', now(), now());
          END IF;
        END IF;
      END LOOP;
    END
    $$;
    """)
  end

  def down do
    drop(table(:listing_environment_images))
    drop(table(:listing_environments))
    drop(table(:listing_images))
  end
end
