-- Convert only known Drizzle timestamp variants to Ecto's :utc_datetime physical
-- representation. PostgreSQL stores timestamptz values as instants; AT TIME ZONE
-- 'UTC' preserves that instant as the intended naive UTC value.
DO $$
DECLARE
  target text;
  target_table_name text;
  target_column_name text;
  current_type text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'whatsapp_link_codes.expires_at', 'whatsapp_link_codes.inserted_at',
    'whatsapp_identities.linked_at', 'listing_short_links.created_at',
    'telegram_link_codes.expires_at', 'telegram_link_codes.inserted_at',
    'telegram_identities.linked_at', 'telegram_events.inserted_at',
    'telegram_events.updated_at', 'listing_analyses.created_at',
    'listing_analyses.updated_at', 'listing_preference_catalog.created_at',
    'listing_preference_catalog.updated_at', 'financeiro_shared_snapshots.created_at',
    'financeiro_shared_snapshots.updated_at', 'organization_invites.expires_at',
    'organization_invites.accepted_at', 'organization_invites.revoked_at',
    'organization_invites.created_at', 'organization_invites.updated_at',
    'financeiro_scenarios.created_at', 'financeiro_scenarios.updated_at'
  ]
  LOOP
    target_table_name := split_part(target, '.', 1);
    target_column_name := split_part(target, '.', 2);

    SELECT columns.data_type INTO current_type
    FROM information_schema.columns AS columns
    WHERE columns.table_schema = 'public'
      AND columns.table_name = target_table_name
      AND columns.column_name = target_column_name;

    IF current_type = 'timestamp with time zone' THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE timestamp(0) without time zone USING date_trunc(''second'', %I AT TIME ZONE ''UTC'')',
        target_table_name, target_column_name, target_column_name
      );
    ELSIF current_type <> 'timestamp without time zone' THEN
      RAISE EXCEPTION 'Refusing unexpected type %.%: %',
        target_table_name, target_column_name, current_type;
    END IF;
  END LOOP;
END
$$;
-- migrate:split

-- Drizzle supplied generation defaults that the corresponding Ecto migrations do
-- not own. Removing them makes both adopted and freshly-created databases match.
DO $$
DECLARE
  target text;
  table_name text;
  column_name text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'whatsapp_link_codes.id', 'whatsapp_link_codes.inserted_at',
    'whatsapp_identities.id', 'whatsapp_identities.linked_at',
    'listing_short_links.created_at', 'telegram_link_codes.id',
    'telegram_link_codes.inserted_at', 'telegram_identities.id',
    'telegram_identities.linked_at', 'telegram_events.id',
    'telegram_events.inserted_at', 'telegram_events.updated_at',
    'listing_analyses.id', 'listing_analyses.created_at', 'listing_analyses.updated_at',
    'listing_preference_catalog.id', 'listing_preference_catalog.created_at',
    'listing_preference_catalog.updated_at', 'financeiro_shared_snapshots.id',
    'financeiro_shared_snapshots.created_at', 'financeiro_shared_snapshots.updated_at',
    'organization_invites.id', 'organization_invites.created_at',
    'organization_invites.updated_at', 'financeiro_scenarios.id',
    'financeiro_scenarios.created_at', 'financeiro_scenarios.updated_at'
  ]
  LOOP
    table_name := split_part(target, '.', 1);
    column_name := split_part(target, '.', 2);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', table_name, column_name);
  END LOOP;
END
$$;
-- migrate:split

-- Ecto deliberately models these IDs without database foreign keys. Drop only
-- foreign keys on the exact legacy columns, regardless of PostgreSQL's generated
-- constraint name.
DO $$
DECLARE
  legacy_fk record;
BEGIN
  FOR legacy_fk IN
    SELECT rel.relname AS table_name, con.conname AS constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    JOIN unnest(con.conkey) AS key(attnum) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = key.attnum
    WHERE ns.nspname = 'public' AND con.contype = 'f'
      AND (rel.relname, att.attname) IN (
        ('whatsapp_link_codes', 'consumed_by_user_id'),
        ('whatsapp_identities', 'user_id'),
        ('telegram_link_codes', 'consumed_by_user_id'),
        ('telegram_identities', 'user_id')
      )
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',
      legacy_fk.table_name, legacy_fk.constraint_name);
  END LOOP;
END
$$;
-- migrate:split

DROP TRIGGER IF EXISTS update_listing_preference_catalog_updated_at
  ON listing_preference_catalog;
-- migrate:split

-- Complete legacy data-only Drizzle migrations even when their SQL files were
-- present locally but missing from the Drizzle journal.
UPDATE listings
SET data = (data - 'listingStatus') || jsonb_build_object('listingEtapa', data->'listingStatus')
WHERE data ? 'listingStatus';
-- migrate:split

UPDATE addons
SET name = 'Financeiro',
    description = 'Planejamento da compra do imóvel com cenários de financiamento, reformas e fluxo mensal'
WHERE slug = 'financiamento';
-- migrate:split

-- Remove a Drizzle-named unique index only when a constraint-backed index covers
-- the same keys. This never removes the last uniqueness guarantee.
DO $$
DECLARE
  pair text[];
  drizzle_oid oid;
  constraint_oid oid;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['users_email_idx', 'users_email_key'],
    ['sessions_token_idx', 'sessions_token_key'],
    ['organizations_slug_idx', 'organizations_slug_key'],
    ['collections_share_token_idx', 'collections_share_token_key'],
    ['addons_slug_idx', 'addons_slug_key'],
    ['financeiro_shared_snapshots_token_idx', 'financeiro_shared_snapshots_token_key'],
    ['organization_invites_token_idx', 'organization_invites_token_key']
  ]
  LOOP
    drizzle_oid := to_regclass(format('public.%I', pair[1]));
    constraint_oid := to_regclass(format('public.%I', pair[2]));

    IF drizzle_oid IS NOT NULL AND constraint_oid IS NOT NULL AND EXISTS (
      SELECT 1
      FROM pg_index candidate
      JOIN pg_index keeper ON keeper.indexrelid = constraint_oid
      WHERE candidate.indexrelid = drizzle_oid
        AND candidate.indrelid = keeper.indrelid
        AND candidate.indkey = keeper.indkey
        AND candidate.indisunique AND keeper.indisunique
        AND candidate.indpred IS NOT DISTINCT FROM keeper.indpred
    ) THEN
      EXECUTE format('DROP INDEX %I', pair[1]);
    END IF;
  END LOOP;
END
$$;
-- migrate:split

-- The duplicated migrations also produced equivalent *_idx and *_index
-- indexes. Keep Ecto's names, but only after proving that every physical
-- property of the two indexes matches.
DO $$
DECLARE
  pair text[];
  drizzle_oid oid;
  ecto_oid oid;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ['whatsapp_link_codes_code_idx', 'whatsapp_link_codes_code_index'],
    ['whatsapp_link_codes_wa_id_idx', 'whatsapp_link_codes_wa_id_index'],
    ['whatsapp_identities_wa_id_idx', 'whatsapp_identities_wa_id_index'],
    ['whatsapp_identities_user_id_idx', 'whatsapp_identities_user_id_index'],
    ['telegram_link_codes_code_idx', 'telegram_link_codes_code_index'],
    ['telegram_link_codes_chat_id_idx', 'telegram_link_codes_chat_id_index'],
    ['telegram_identities_chat_id_idx', 'telegram_identities_chat_id_index'],
    ['telegram_identities_user_id_idx', 'telegram_identities_user_id_index'],
    ['telegram_events_provider_event_id_idx', 'telegram_events_provider_event_id_index'],
    ['telegram_events_status_idx', 'telegram_events_status_index']
  ]
  LOOP
    drizzle_oid := to_regclass(format('public.%I', pair[1]));
    ecto_oid := to_regclass(format('public.%I', pair[2]));

    IF drizzle_oid IS NOT NULL AND ecto_oid IS NOT NULL AND EXISTS (
      SELECT 1
      FROM pg_index candidate
      JOIN pg_index keeper ON keeper.indexrelid = ecto_oid
      WHERE candidate.indexrelid = drizzle_oid
        AND candidate.indrelid = keeper.indrelid
        AND candidate.indkey = keeper.indkey
        AND candidate.indclass = keeper.indclass
        AND candidate.indcollation = keeper.indcollation
        AND candidate.indoption = keeper.indoption
        AND candidate.indisunique = keeper.indisunique
        AND candidate.indpred IS NOT DISTINCT FROM keeper.indpred
        AND candidate.indexprs IS NOT DISTINCT FROM keeper.indexprs
    ) THEN
      EXECUTE format('DROP INDEX %I', pair[1]);
    END IF;
  END LOOP;
END
$$;
-- migrate:split

DROP TABLE IF EXISTS drizzle.__drizzle_migrations;
-- migrate:split

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle') THEN
    BEGIN
      DROP SCHEMA drizzle;
    EXCEPTION
      WHEN dependent_objects_still_exist THEN
        RAISE NOTICE 'Preserving non-empty drizzle schema after removing its migration ledger';
    END;
  END IF;
END
$$;
