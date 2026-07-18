DO $$
DECLARE
  required_tables text[] := ARRAY[
    'users', 'accounts', 'sessions', 'verifications', 'jwks', 'plans', 'subscriptions',
    'organizations', 'organization_members', 'collections', 'listings', 'addons',
    'user_addons', 'organization_addons', 'saved_links', 'contacts', 'regions',
    'condominiums', 'listing_comparison_notes', 'oban_jobs', 'ai_workflow_runs',
    'ai_attachments', 'chat_conversations', 'chat_messages', 'ai_duplicate_candidates',
    'mcp_tokens', 'mcp_tool_calls', 'whatsapp_events', 'whatsapp_link_codes',
    'whatsapp_identities', 'listing_short_links', 'telegram_link_codes',
    'telegram_identities', 'telegram_events', 'listing_analyses', 'portal_searches',
    'portal_search_runs', 'cached_search_pages', 'portal_search_targets', 'short_listings',
    'short_listing_run_hits', 'processed_webhook_events', 'listing_preference_catalog',
    'listing_merge_sessions', 'financeiro_shared_snapshots', 'organization_invites',
    'financeiro_scenarios'
  ];
  present_tables text;
  missing_tables text;
  missing_columns text;
  invalid_types text;
  invalid_primary_keys text;
  missing_foreign_keys text;
  missing_constraints text;
BEGIN
  SELECT string_agg(name, ', ' ORDER BY name)
  INTO present_tables
  FROM unnest(required_tables) AS name
  WHERE to_regclass(format('public.%I', name)) IS NOT NULL;

  -- No application table means a genuinely fresh database. The following assets
  -- bootstrap only the Drizzle-owned foundation; historical Ecto migrations then
  -- create their own tables normally.
  IF present_tables IS NULL THEN
    RETURN;
  END IF;

  SELECT string_agg(name, ', ' ORDER BY name)
  INTO missing_tables
  FROM unnest(required_tables) AS name
  WHERE to_regclass(format('public.%I', name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'canonical baseline refused a partial database',
      DETAIL = 'Missing tables: ' || missing_tables,
      HINT = 'Restore the expected mixed-migration schema or start with an empty database.';
  END IF;

  SELECT string_agg(spec.table_name || '.' || column_name, ', ' ORDER BY 1)
  INTO missing_columns
  FROM (VALUES
    ('users', ARRAY['id','email','email_verified','name','image','is_admin','cpf_cnpj','stripe_customer_id','created_at','updated_at']),
    ('accounts', ARRAY['id','user_id','account_id','provider_id','access_token','refresh_token','access_token_expires_at','refresh_token_expires_at','scope','id_token','password','created_at','updated_at']),
    ('sessions', ARRAY['id','user_id','token','expires_at','ip_address','user_agent','created_at','updated_at']),
    ('verifications', ARRAY['id','identifier','value','expires_at','created_at','updated_at']),
    ('jwks', ARRAY['id','public_key','private_key','created_at','expires_at','alg','crv']),
    ('plans', ARRAY['id','name','slug','description','price_in_cents','is_active','limits','stripe_price_id','created_at','updated_at']),
    ('subscriptions', ARRAY['id','user_id','plan_id','status','starts_at','expires_at','granted_by','notes','stripe_customer_id','stripe_subscription_id','stripe_status','current_period_end','cancel_at_period_end','last_payment_failed_at','created_at','updated_at']),
    ('organizations', ARRAY['id','name','slug','owner_id','created_at','updated_at']),
    ('organization_members', ARRAY['id','org_id','user_id','role','joined_at']),
    ('collections', ARRAY['id','user_id','org_id','name','is_public','share_token','is_default','created_at','updated_at']),
    ('listings', ARRAY['id','collection_id','data','created_at','updated_at']),
    ('addons', ARRAY['id','name','slug','description','created_at']),
    ('user_addons', ARRAY['id','user_id','addon_slug','granted_at','granted_by','enabled','expires_at']),
    ('organization_addons', ARRAY['id','organization_id','addon_slug','granted_at','granted_by','enabled','expires_at']),
    ('saved_links', ARRAY['id','user_id','org_id','title','url','description','created_at','updated_at']),
    ('contacts', ARRAY['id','user_id','org_id','name','phone','normalized_phone','email','notes','source','created_at','updated_at']),
    ('regions', ARRAY['id','user_id','org_id','city','neighborhood','property_type','price_per_m2','notes','created_at','updated_at']),
    ('condominiums', ARRAY['id','user_id','org_id','name','city','neighborhood','address','property_type','amenities','notes','source','created_at','updated_at']),
    ('listing_comparison_notes', ARRAY['id','listing_id','pros','cons','notes','created_at','updated_at']),
    ('whatsapp_link_codes', ARRAY['id','code','wa_id','phone','status','expires_at','consumed_by_user_id','inserted_at']),
    ('whatsapp_identities', ARRAY['id','wa_id','user_id','phone','linked_at']),
    ('listing_short_links', ARRAY['short_id','listing_id','collection_id','created_at']),
    ('telegram_link_codes', ARRAY['id','code','chat_id','telegram_user_id','status','expires_at','consumed_by_user_id','inserted_at']),
    ('telegram_identities', ARRAY['id','chat_id','user_id','telegram_user_id','linked_at']),
    ('telegram_events', ARRAY['id','provider_event_id','payload','status','error','inserted_at','updated_at']),
    ('listing_analyses', ARRAY['id','listing_id','workflow_run_id','user_id','org_id','status','input','result','error','created_at','updated_at']),
    ('processed_webhook_events', ARRAY['id','event_type','processed_at']),
    ('listing_preference_catalog', ARRAY['id','user_id','org_id','key','label','source','visible','sort_order','legacy_key','created_at','updated_at']),
    ('financeiro_shared_snapshots', ARRAY['id','token','user_id','org_id','title','payload','created_at','updated_at']),
    ('organization_invites', ARRAY['id','org_id','token','role','status','created_by_user_id','accepted_by_user_id','expires_at','accepted_at','revoked_at','created_at','updated_at']),
    ('financeiro_scenarios', ARRAY['id','collection_id','name','payload','created_at','updated_at'])
  ) AS spec(table_name, columns)
  CROSS JOIN LATERAL unnest(spec.columns) AS column_name
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = spec.table_name
      AND c.column_name = column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'canonical baseline found incompatible table shapes',
      DETAIL = 'Missing columns: ' || missing_columns;
  END IF;

  SELECT string_agg(
    spec.table_name || '.' || spec.column_name || '=' || coalesce(c.data_type, '<missing>'),
    ', ' ORDER BY 1
  )
  INTO invalid_types
  FROM (VALUES
    ('users','id','uuid'), ('accounts','id','uuid'), ('accounts','user_id','uuid'),
    ('sessions','id','uuid'), ('sessions','user_id','uuid'), ('plans','id','uuid'),
    ('subscriptions','id','uuid'), ('subscriptions','user_id','uuid'),
    ('subscriptions','plan_id','uuid'), ('organizations','id','uuid'),
    ('organizations','owner_id','uuid'), ('organization_members','id','uuid'),
    ('organization_members','org_id','uuid'), ('organization_members','user_id','uuid'),
    ('collections','id','uuid'), ('collections','user_id','uuid'),
    ('collections','org_id','uuid'), ('listings','id','uuid'),
    ('listings','collection_id','uuid'), ('listings','data','jsonb'),
    ('addons','id','uuid'), ('user_addons','id','uuid'),
    ('organization_addons','id','uuid'), ('saved_links','id','uuid'),
    ('contacts','id','uuid'), ('regions','id','uuid'), ('condominiums','id','uuid'),
    ('condominiums','amenities','jsonb'), ('listing_comparison_notes','id','uuid'),
    ('listing_comparison_notes','pros','jsonb'), ('listing_comparison_notes','cons','jsonb'),
    ('whatsapp_link_codes','id','uuid'), ('whatsapp_identities','id','uuid'),
    ('listing_short_links','short_id','text'), ('telegram_link_codes','id','uuid'),
    ('telegram_identities','id','uuid'), ('telegram_events','id','uuid'),
    ('telegram_events','payload','jsonb'), ('listing_analyses','id','uuid'),
    ('listing_analyses','input','jsonb'), ('listing_analyses','result','jsonb'),
    ('processed_webhook_events','id','text'), ('listing_preference_catalog','id','uuid'),
    ('financeiro_shared_snapshots','id','uuid'),
    ('financeiro_shared_snapshots','payload','jsonb'), ('organization_invites','id','uuid'),
    ('financeiro_scenarios','id','uuid'), ('financeiro_scenarios','payload','jsonb')
  ) AS spec(table_name, column_name, expected_type)
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public' AND c.table_name = spec.table_name
   AND c.column_name = spec.column_name
  WHERE c.data_type IS DISTINCT FROM spec.expected_type;

  IF invalid_types IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'canonical baseline found incompatible column types',
      DETAIL = invalid_types;
  END IF;

  SELECT string_agg(spec.table_name || '(' || spec.pk_column || ')', ', ' ORDER BY 1)
  INTO invalid_primary_keys
  FROM (VALUES
    ('users','id'), ('accounts','id'), ('sessions','id'), ('verifications','id'),
    ('jwks','id'), ('plans','id'), ('subscriptions','id'), ('organizations','id'),
    ('organization_members','id'), ('collections','id'), ('listings','id'), ('addons','id'),
    ('user_addons','id'), ('organization_addons','id'), ('saved_links','id'),
    ('contacts','id'), ('regions','id'), ('condominiums','id'),
    ('listing_comparison_notes','id'), ('whatsapp_link_codes','id'),
    ('whatsapp_identities','id'), ('listing_short_links','short_id'),
    ('telegram_link_codes','id'), ('telegram_identities','id'), ('telegram_events','id'),
    ('listing_analyses','id'), ('processed_webhook_events','id'),
    ('listing_preference_catalog','id'), ('financeiro_shared_snapshots','id'),
    ('organization_invites','id'), ('financeiro_scenarios','id')
  ) AS spec(table_name, pk_column)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    JOIN unnest(con.conkey) AS key(attnum) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = key.attnum
    WHERE ns.nspname = 'public' AND rel.relname = spec.table_name
      AND con.contype = 'p' AND att.attname = spec.pk_column
  );

  IF invalid_primary_keys IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'canonical baseline found missing or incompatible primary keys',
      DETAIL = invalid_primary_keys;
  END IF;

  SELECT string_agg(
    spec.table_name || '.' || spec.column_name || '->' || spec.referenced_table,
    ', ' ORDER BY 1
  )
  INTO missing_foreign_keys
  FROM (VALUES
    ('accounts','user_id','users'), ('sessions','user_id','users'),
    ('subscriptions','user_id','users'), ('subscriptions','plan_id','plans'),
    ('subscriptions','granted_by','users'), ('organizations','owner_id','users'),
    ('organization_members','org_id','organizations'),
    ('organization_members','user_id','users'), ('collections','user_id','users'),
    ('collections','org_id','organizations'), ('listings','collection_id','collections'),
    ('user_addons','user_id','users'), ('user_addons','granted_by','users'),
    ('organization_addons','organization_id','organizations'),
    ('organization_addons','granted_by','users'), ('saved_links','user_id','users'),
    ('saved_links','org_id','organizations'), ('contacts','user_id','users'),
    ('contacts','org_id','organizations'), ('regions','user_id','users'),
    ('regions','org_id','organizations'), ('condominiums','user_id','users'),
    ('condominiums','org_id','organizations'),
    ('listing_comparison_notes','listing_id','listings'),
    ('listing_short_links','listing_id','listings'),
    ('listing_short_links','collection_id','collections'),
    ('listing_analyses','listing_id','listings'),
    ('listing_analyses','workflow_run_id','ai_workflow_runs'),
    ('listing_analyses','user_id','users'),
    ('listing_analyses','org_id','organizations'),
    ('listing_preference_catalog','user_id','users'),
    ('listing_preference_catalog','org_id','organizations'),
    ('financeiro_shared_snapshots','user_id','users'),
    ('financeiro_shared_snapshots','org_id','organizations'),
    ('organization_invites','org_id','organizations'),
    ('organization_invites','created_by_user_id','users'),
    ('organization_invites','accepted_by_user_id','users'),
    ('financeiro_scenarios','collection_id','collections')
  ) AS spec(table_name, column_name, referenced_table)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    JOIN pg_class ref ON ref.oid = con.confrelid
    JOIN unnest(con.conkey) WITH ORDINALITY AS local_key(attnum, ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY AS remote_key(attnum, ord)
      ON remote_key.ord = local_key.ord
    JOIN pg_attribute local_att
      ON local_att.attrelid = rel.oid AND local_att.attnum = local_key.attnum
    JOIN pg_attribute remote_att
      ON remote_att.attrelid = ref.oid AND remote_att.attnum = remote_key.attnum
    WHERE con.contype = 'f' AND ns.nspname = 'public'
      AND rel.relname = spec.table_name AND local_att.attname = spec.column_name
      AND ref.relname = spec.referenced_table AND remote_att.attname = 'id'
  );

  IF missing_foreign_keys IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'canonical baseline found missing relationship constraints',
      DETAIL = missing_foreign_keys;
  END IF;

  -- These checks encode data-ownership invariants that later workspace migrations
  -- rely on. A database already past the workspace cutover legitimately replaced
  -- the two original owner checks, so only require them before that cutover.
  SELECT string_agg(constraint_name, ', ' ORDER BY constraint_name)
  INTO missing_constraints
  FROM unnest(ARRAY[
    'subscriptions_status_check', 'organization_members_role_check',
    'saved_links_owner_check', 'contacts_owner_check', 'contacts_source_check',
    'regions_owner_check', 'regions_property_type_check', 'regions_price_per_m2_check',
    'condominiums_owner_check', 'condominiums_property_type_check',
    'condominiums_source_check', 'listing_preference_catalog_source_check',
    'financeiro_shared_snapshots_owner_check', 'organization_invites_role_check',
    'organization_invites_status_check'
  ]) AS constraint_name
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = constraint_name
  );

  IF to_regclass('public.workspaces') IS NULL THEN
    SELECT concat_ws(', ', missing_constraints,
      CASE WHEN NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'collections_owner_check'
      ) THEN 'collections_owner_check' END,
      CASE WHEN NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listing_preference_catalog_owner_check'
      ) THEN 'listing_preference_catalog_owner_check' END)
    INTO missing_constraints;
  END IF;

  IF nullif(missing_constraints, '') IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'canonical baseline found missing ownership or state constraints',
      DETAIL = missing_constraints;
  END IF;
END
$$;
