defmodule MinhaCasaAi.Repo.Migrations.EnglishListingDataContract do
  use Ecto.Migration

  def up do
    execute("""
    DO $$
    DECLARE
      issues text;
    BEGIN
      IF EXISTS (
        WITH listing_payloads AS (
          SELECT 'listings.data' AS source, data AS value FROM listings
          UNION ALL
          SELECT 'listing_merge_sessions.imported_data', imported_data FROM listing_merge_sessions
          UNION ALL
          SELECT 'listing_merge_sessions.current_data', current_data FROM listing_merge_sessions
          UNION ALL
          SELECT 'chat_conversations.metadata.pending.items.listing_data', item -> 'listing_data'
          FROM chat_conversations
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(metadata #> '{pending,items}') = 'array'
                THEN metadata #> '{pending,items}'
              ELSE '[]'::jsonb
            END
          ) AS item
          WHERE jsonb_typeof(item) = 'object' AND item ? 'listing_data'
          UNION ALL
          SELECT 'ai_workflow_runs.result.listings', item
          FROM ai_workflow_runs
          CROSS JOIN LATERAL jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(result -> 'listings') = 'array'
                THEN result -> 'listings'
              ELSE '[]'::jsonb
            END
          ) AS item
        )
        SELECT 1
        FROM listing_payloads
        WHERE value IS NULL OR jsonb_typeof(value) <> 'object'
      ) THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: every listing payload must be a JSON object';
      END IF;

      WITH listing_payloads AS (
        SELECT 'listings.data' AS source, data AS value FROM listings
        UNION ALL
        SELECT 'listing_merge_sessions.imported_data', imported_data FROM listing_merge_sessions
        UNION ALL
        SELECT 'listing_merge_sessions.current_data', current_data FROM listing_merge_sessions
        UNION ALL
        SELECT 'chat_conversations.metadata.pending.items.listing_data', item -> 'listing_data'
        FROM chat_conversations
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(metadata #> '{pending,items}') = 'array'
              THEN metadata #> '{pending,items}'
            ELSE '[]'::jsonb
          END
        ) AS item
        WHERE jsonb_typeof(item) = 'object' AND item ? 'listing_data'
        UNION ALL
        SELECT 'ai_workflow_runs.result.listings', item
        FROM ai_workflow_runs
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(result -> 'listings') = 'array'
              THEN result -> 'listings'
            ELSE '[]'::jsonb
          END
        ) AS item
      )
      SELECT string_agg(DISTINCT source || ':' || key, ', ' ORDER BY source || ':' || key)
      INTO issues
      FROM listing_payloads, LATERAL jsonb_object_keys(value) AS key
      WHERE key <> ALL (ARRAY[
        'title','manualTitle','address','neighborhood','city','totalAreaM2','privateAreaM2',
        'bedrooms','suites','bathrooms','parkingSpots','constructionYear','price','pricePerM2',
        'floor','propertyType','stage','sourceUrl','notes','contactName','contactNumber',
        'condominiumName','condominiumId','regionId','coverImageIndex','imageUrl','imageUrls',
        'imageStorageKeys','imageFingerprints','imageEnvironments','imageIngestionStatus',
        'imageIngestionError','starred','visited','strikethrough','discardedReason','addedAt',
        'sitePublishedAt','siteUpdatedAt','customLat','customLng','features',
        'titulo','tituloManual','endereco','bairro','cidade','m2Totais','m2Privado','quartos',
        'banheiros','garagem','anoConstrucao','preco','precoVenda','valor','precoM2','andar',
        'tipoImovel','listingEtapa','listingStatus','etapa','link','observacoes','corretor',
        'telefone','condominioNome','imageCoverIndex','coverImageUrl','preferences','piscina',
        'porteiro24h','academia','vistaLivre','piscinaTermica','idade','imageCategories'
      ]);

      IF issues IS NOT NULL THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: unknown keys: %', issues;
      END IF;

      SELECT string_agg(DISTINCT legacy || '/' || canonical, ', ' ORDER BY legacy || '/' || canonical)
      INTO issues
      FROM listings
      CROSS JOIN (VALUES
        ('titulo','title'),('tituloManual','manualTitle'),('endereco','address'),
        ('bairro','neighborhood'),('cidade','city'),('m2Totais','totalAreaM2'),
        ('m2Privado','privateAreaM2'),('quartos','bedrooms'),('banheiros','bathrooms'),
        ('garagem','parkingSpots'),('anoConstrucao','constructionYear'),('preco','price'),
        ('precoM2','pricePerM2'),('andar','floor'),('link','sourceUrl'),('observacoes','notes'),
        ('corretor','contactName'),('telefone','contactNumber'),
        ('condominioNome','condominiumName'),('imageCoverIndex','coverImageIndex')
      ) AS mapping(legacy, canonical)
      WHERE data ? legacy AND data ? canonical AND data -> legacy IS DISTINCT FROM data -> canonical;

      IF issues IS NOT NULL THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: conflicting PT/EN keys: %', issues;
      END IF;

      IF EXISTS (
        SELECT 1 FROM listings
        WHERE data ? 'tipoImovel' AND data ? 'propertyType'
          AND CASE data ->> 'tipoImovel'
                WHEN 'casa' THEN 'house'
                WHEN 'apartamento' THEN 'apartment'
                ELSE data ->> 'tipoImovel'
              END IS DISTINCT FROM data ->> 'propertyType'
      ) THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: conflicting tipoImovel/propertyType';
      END IF;

      IF EXISTS (
        SELECT 1 FROM listings
        WHERE data ? 'listingEtapa' AND data ? 'stage'
          AND CASE data ->> 'listingEtapa'
                WHEN 'analisando' THEN 'analyzing'
                WHEN 'considerando' THEN 'considering'
                WHEN 'marcando_visita' THEN 'scheduling_visit'
                WHEN 'visita_marcada' THEN 'visit_scheduled'
                WHEN 'visitando' THEN 'visiting'
                WHEN 'visitado' THEN 'visited'
                WHEN 'negociando' THEN 'negotiating'
                WHEN 'proposta_enviada' THEN 'offer_submitted'
                WHEN 'em_espera' THEN 'on_hold'
                WHEN 'descartando' THEN 'discarding'
                WHEN 'descartado' THEN 'discarded'
                WHEN 'vendido' THEN 'sold'
                ELSE data ->> 'listingEtapa'
              END IS DISTINCT FROM data ->> 'stage'
      ) THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: conflicting listingEtapa/stage';
      END IF;

      IF EXISTS (
        SELECT 1 FROM listings
        WHERE trim(COALESCE(CASE WHEN data ? 'title' THEN data ->> 'title' ELSE data ->> 'titulo' END, '')) = ''
           OR trim(COALESCE(CASE WHEN data ? 'address' THEN data ->> 'address' ELSE data ->> 'endereco' END, '')) = ''
      ) THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: title and address are required';
      END IF;

      IF EXISTS (
        SELECT 1 FROM listings
        WHERE COALESCE(CASE WHEN data ? 'propertyType' THEN data ->> 'propertyType' ELSE data ->> 'tipoImovel' END, '')
              NOT IN ('','house','apartment','casa','apartamento')
           OR COALESCE(
                CASE
                  WHEN data ? 'stage' THEN data ->> 'stage'
                  WHEN data ? 'listingEtapa' THEN data ->> 'listingEtapa'
                  WHEN data ? 'listingStatus' THEN data ->> 'listingStatus'
                  ELSE data ->> 'etapa'
                END,
                ''
              ) NOT IN (
                '','analyzing','considering','scheduling_visit','visit_scheduled','visiting',
                'visited','negotiating','offer_submitted','on_hold','discarding','discarded','sold',
                'analisando','considerando','marcando_visita','visita_marcada','visitando',
                'visitado','negociando','proposta_enviada','em_espera','descartando','descartado','vendido'
              )
      ) THEN
        RAISE EXCEPTION 'ListingData v2 preflight failed: invalid propertyType or stage';
      END IF;
    END
    $$;
    """)

    execute("""
    CREATE OR REPLACE FUNCTION listing_data_v2_feature_key(input text)
    RETURNS text
    LANGUAGE sql
    IMMUTABLE
    AS $$
      SELECT CASE input
        WHEN 'piscina' THEN 'pool'
        WHEN 'academia' THEN 'gym'
        WHEN 'portaria' THEN 'doorman24h'
        WHEN 'porteiro24h' THEN 'doorman24h'
        WHEN 'vista_livre' THEN 'unobstructedView'
        WHEN 'vistaLivre' THEN 'unobstructedView'
        WHEN 'piscina_termica' THEN 'heatedPool'
        WHEN 'piscinaTermica' THEN 'heatedPool'
        WHEN 'esquina' THEN 'cornerLot'
        WHEN 'cobertura' THEN 'penthouse'
        WHEN 'jardim' THEN 'garden'
        WHEN 'terrea' THEN 'singleStory'
        ELSE input
      END
    $$;
    """)

    execute("""
    CREATE OR REPLACE FUNCTION listing_data_v2(input jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    IMMUTABLE
    AS $$
    DECLARE
      result jsonb;
      source_key text;
      target_key text;
      item record;
      legacy_features jsonb := '{}'::jsonb;
      canonical_features jsonb := '{}'::jsonb;
      features jsonb := '{}'::jsonb;
      spaces jsonb := '[]'::jsonb;
      space jsonb;
      kind text;
    BEGIN
      IF input IS NULL OR jsonb_typeof(input) <> 'object' THEN
        RETURN '{}'::jsonb;
      END IF;

      result := input - ARRAY[
        'titulo', 'tituloManual', 'endereco', 'bairro', 'cidade', 'm2Totais', 'm2Privado',
        'quartos', 'banheiros', 'garagem', 'anoConstrucao', 'preco', 'precoVenda', 'valor',
        'precoM2', 'andar', 'tipoImovel', 'listingEtapa', 'listingStatus', 'etapa', 'link',
        'observacoes', 'corretor', 'telefone', 'condominioNome', 'imageCoverIndex',
        'coverImageUrl', 'preferences', 'piscina', 'porteiro24h', 'academia', 'vistaLivre',
        'piscinaTermica', 'idade', 'imageCategories'
      ];

      FOR source_key, target_key IN
        SELECT * FROM (VALUES
          ('titulo', 'title'), ('tituloManual', 'manualTitle'), ('endereco', 'address'),
          ('bairro', 'neighborhood'), ('cidade', 'city'), ('m2Totais', 'totalAreaM2'),
          ('m2Privado', 'privateAreaM2'), ('quartos', 'bedrooms'),
          ('banheiros', 'bathrooms'), ('garagem', 'parkingSpots'),
          ('anoConstrucao', 'constructionYear'), ('preco', 'price'),
          ('precoM2', 'pricePerM2'), ('andar', 'floor'), ('tipoImovel', 'propertyType'),
          ('listingEtapa', 'stage'), ('link', 'sourceUrl'), ('observacoes', 'notes'),
          ('corretor', 'contactName'), ('telefone', 'contactNumber'),
          ('condominioNome', 'condominiumName'), ('imageCoverIndex', 'coverImageIndex'),
          ('coverImageUrl', 'imageUrl')
        ) AS mappings(source_key, target_key)
      LOOP
        IF NOT input ? target_key AND input ? source_key THEN
          result := jsonb_set(result, ARRAY[target_key], input -> source_key, true);
        END IF;
      END LOOP;

      IF NOT input ? 'price' AND NOT input ? 'preco' THEN
        IF input ? 'precoVenda' THEN
          result := jsonb_set(result, '{price}', input -> 'precoVenda', true);
        ELSIF input ? 'valor' THEN
          result := jsonb_set(result, '{price}', input -> 'valor', true);
        END IF;
      END IF;

      IF result ? 'constructionYear' THEN
        IF result ->> 'constructionYear' ~ '^\\d{4}(\\.0+)?$' AND
           (result ->> 'constructionYear')::numeric BETWEEN 1000 AND 9999 THEN
          result := jsonb_set(
            result,
            '{constructionYear}',
            to_jsonb((result ->> 'constructionYear')::numeric::integer),
            true
          );
        ELSE
          result := jsonb_set(result, '{constructionYear}', 'null'::jsonb, true);
        END IF;
      END IF;

      IF NOT input ? 'stage' AND NOT input ? 'listingEtapa' THEN
        IF input ? 'listingStatus' THEN
          result := jsonb_set(result, '{stage}', input -> 'listingStatus', true);
        ELSIF input ? 'etapa' THEN
          result := jsonb_set(result, '{stage}', input -> 'etapa', true);
        ELSIF input ->> 'strikethrough' = 'true' THEN
          result := jsonb_set(result, '{stage}', '"discarded"'::jsonb, true);
        ELSIF input ->> 'visited' = 'true' THEN
          result := jsonb_set(result, '{stage}', '"visited"'::jsonb, true);
        END IF;
      END IF;

      IF result ? 'propertyType' AND jsonb_typeof(result -> 'propertyType') = 'string' THEN
        result := jsonb_set(result, '{propertyType}', to_jsonb(CASE result ->> 'propertyType'
          WHEN 'casa' THEN 'house'
          WHEN 'apartamento' THEN 'apartment'
          ELSE result ->> 'propertyType'
        END), true);
      END IF;

      IF result ? 'stage' AND jsonb_typeof(result -> 'stage') = 'string' THEN
        result := jsonb_set(result, '{stage}', to_jsonb(CASE result ->> 'stage'
          WHEN 'analisando' THEN 'analyzing'
          WHEN 'considerando' THEN 'considering'
          WHEN 'marcando_visita' THEN 'scheduling_visit'
          WHEN 'visita_marcada' THEN 'visit_scheduled'
          WHEN 'visitando' THEN 'visiting'
          WHEN 'visitado' THEN 'visited'
          WHEN 'negociando' THEN 'negotiating'
          WHEN 'proposta_enviada' THEN 'offer_submitted'
          WHEN 'em_espera' THEN 'on_hold'
          WHEN 'descartando' THEN 'discarding'
          WHEN 'descartado' THEN 'discarded'
          WHEN 'vendido' THEN 'sold'
          ELSE result ->> 'stage'
        END), true);
      END IF;

      IF jsonb_typeof(input -> 'preferences') = 'object' THEN
        FOR item IN SELECT key, value FROM jsonb_each(input -> 'preferences') LOOP
          legacy_features := jsonb_set(
            legacy_features,
            ARRAY[listing_data_v2_feature_key(item.key)],
            CASE
              WHEN item.value IN ('true'::jsonb, 'false'::jsonb, 'null'::jsonb) THEN item.value
              ELSE 'null'::jsonb
            END,
            true
          );
        END LOOP;
      END IF;

      IF jsonb_typeof(input -> 'features') = 'object' THEN
        FOR item IN SELECT key, value FROM jsonb_each(input -> 'features') LOOP
          canonical_features := jsonb_set(
            canonical_features,
            ARRAY[listing_data_v2_feature_key(item.key)],
            CASE
              WHEN item.value IN ('true'::jsonb, 'false'::jsonb, 'null'::jsonb) THEN item.value
              ELSE 'null'::jsonb
            END,
            true
          );
        END LOOP;
      END IF;

      features := legacy_features || canonical_features;

      FOR source_key, target_key IN
        SELECT * FROM (VALUES
          ('piscina', 'pool'), ('academia', 'gym'), ('porteiro24h', 'doorman24h'),
          ('vistaLivre', 'unobstructedView'), ('piscinaTermica', 'heatedPool')
        ) AS mirrors(source_key, target_key)
      LOOP
        IF NOT features ? target_key AND input ? source_key THEN
          features := jsonb_set(
            features,
            ARRAY[target_key],
            CASE
              WHEN (input -> source_key) IN ('true'::jsonb, 'false'::jsonb, 'null'::jsonb)
                THEN input -> source_key
              ELSE 'null'::jsonb
            END,
            true
          );
        END IF;
      END LOOP;

      IF input ? 'features' OR input ? 'preferences' OR
         input ?| ARRAY['piscina', 'academia', 'porteiro24h', 'vistaLivre', 'piscinaTermica'] THEN
        result := jsonb_set(result, '{features}', features, true);
      END IF;

      IF jsonb_typeof(result -> 'imageEnvironments') = 'array' THEN
        FOR space IN SELECT value FROM jsonb_array_elements(result -> 'imageEnvironments') LOOP
          IF jsonb_typeof(space) = 'object' AND jsonb_typeof(space -> 'kind') = 'string' THEN
            kind := CASE space ->> 'kind'
              WHEN 'areaExterna' THEN 'exterior'
              WHEN 'sala' THEN 'livingRoom'
              WHEN 'cozinha' THEN 'kitchen'
              WHEN 'quarto' THEN 'bedroom'
              WHEN 'banheiro' THEN 'bathroom'
              WHEN 'garagem' THEN 'garage'
              WHEN 'varanda' THEN 'balcony'
              WHEN 'areaServico' THEN 'utilityRoom'
              ELSE space ->> 'kind'
            END;
            space := jsonb_set(space, '{kind}', to_jsonb(kind), true);
          END IF;
          spaces := spaces || jsonb_build_array(space);
        END LOOP;
        result := jsonb_set(result, '{imageEnvironments}', spaces, true);
      END IF;

      SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      INTO result
      FROM jsonb_each(result) AS entry
      WHERE entry.key = ANY (ARRAY[
        'title','manualTitle','address','neighborhood','city','totalAreaM2','privateAreaM2',
        'bedrooms','suites','bathrooms','parkingSpots','constructionYear','price','pricePerM2',
        'floor','propertyType','stage','sourceUrl','notes','contactName','contactNumber',
        'condominiumName','condominiumId','regionId','coverImageIndex','imageUrl','imageUrls',
        'imageStorageKeys','imageFingerprints','imageEnvironments','imageIngestionStatus',
        'imageIngestionError','starred','visited','strikethrough','discardedReason','addedAt',
        'sitePublishedAt','siteUpdatedAt','customLat','customLng','features'
      ]);

      RETURN result;
    END
    $$;
    """)

    execute("UPDATE listings SET data = listing_data_v2(data)")

    execute("""
    UPDATE listing_merge_sessions
    SET imported_data = listing_data_v2(imported_data),
        current_data = listing_data_v2(current_data),
        status = CASE WHEN status IN ('preparing', 'ready') THEN 'expired' ELSE status END,
        error = CASE
          WHEN status IN ('preparing', 'ready') THEN 'ListingData v2 migration; restart merge'
          ELSE error
        END
    """)

    execute("""
    UPDATE chat_conversations
    SET metadata = jsonb_set(
      metadata,
      '{pending,items}',
      (
        SELECT COALESCE(jsonb_agg(
          CASE
            WHEN jsonb_typeof(item) = 'object' AND item ? 'listing_data'
              THEN jsonb_set(item, '{listing_data}', listing_data_v2(item -> 'listing_data'), true)
            ELSE item
          END
        ), '[]'::jsonb)
        FROM jsonb_array_elements(metadata #> '{pending,items}') AS item
      ),
      false
    )
    WHERE jsonb_typeof(metadata #> '{pending,items}') = 'array'
    """)

    execute("""
    UPDATE ai_workflow_runs
    SET result = jsonb_set(
      result,
      '{listings}',
      (
        SELECT COALESCE(jsonb_agg(listing_data_v2(item)), '[]'::jsonb)
        FROM jsonb_array_elements(result -> 'listings') AS item
      ),
      false
    )
    WHERE jsonb_typeof(result -> 'listings') = 'array'
    """)

    execute("""
    DELETE FROM listing_preference_catalog old
    USING listing_preference_catalog canonical
    WHERE old.source = 'system'
      AND old.key IN ('piscina', 'academia', 'portaria', 'vista_livre', 'piscina_termica',
                      'esquina', 'cobertura', 'jardim', 'terrea')
      AND canonical.key = CASE old.key
        WHEN 'piscina' THEN 'pool'
        WHEN 'academia' THEN 'gym'
        WHEN 'portaria' THEN 'doorman24h'
        WHEN 'vista_livre' THEN 'unobstructedView'
        WHEN 'piscina_termica' THEN 'heatedPool'
        WHEN 'esquina' THEN 'cornerLot'
        WHEN 'cobertura' THEN 'penthouse'
        WHEN 'jardim' THEN 'garden'
        WHEN 'terrea' THEN 'singleStory'
      END
      AND canonical.user_id IS NOT DISTINCT FROM old.user_id
      AND canonical.org_id IS NOT DISTINCT FROM old.org_id
    """)

    execute("""
    UPDATE listing_preference_catalog
    SET key = CASE key
          WHEN 'piscina' THEN 'pool'
          WHEN 'academia' THEN 'gym'
          WHEN 'portaria' THEN 'doorman24h'
          WHEN 'vista_livre' THEN 'unobstructedView'
          WHEN 'piscina_termica' THEN 'heatedPool'
          WHEN 'esquina' THEN 'cornerLot'
          WHEN 'cobertura' THEN 'penthouse'
          WHEN 'jardim' THEN 'garden'
          WHEN 'terrea' THEN 'singleStory'
        END,
        legacy_key = NULL
    WHERE source = 'system'
      AND key IN ('piscina', 'academia', 'portaria', 'vista_livre', 'piscina_termica',
                  'esquina', 'cobertura', 'jardim', 'terrea')
    """)

    rename(table(:listing_preference_catalog), to: table(:listing_feature_catalog))

    alter table(:listing_feature_catalog) do
      remove(:legacy_key)
    end

    execute("DROP FUNCTION listing_data_v2(jsonb)")
    execute("DROP FUNCTION listing_data_v2_feature_key(text)")
  end

  def down do
    raise "ListingData v2 migration is intentionally irreversible"
  end
end
