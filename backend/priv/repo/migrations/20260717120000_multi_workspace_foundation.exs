defmodule MinhaCasaAi.Repo.Migrations.MultiWorkspaceFoundation do
  use Ecto.Migration

  def up do
    execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    create table(:workspaces, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))
      add(:type, :text, null: false)
      add(:owner_user_id, references(:users, type: :uuid, on_delete: :restrict))
      add(:name, :text, null: false)
      add(:status, :text, null: false, default: "active")
      add(:settings, :map, null: false, default: %{})
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(index(:workspaces, [:owner_user_id]))
    create(index(:workspaces, [:type, :status]))

    create(
      constraint(:workspaces, :workspaces_type_check,
        check: "type IN ('personal', 'professional', 'organization')"
      )
    )

    create(
      constraint(:workspaces, :workspaces_status_check,
        check: "status IN ('active', 'frozen', 'archived')"
      )
    )

    create(
      constraint(:workspaces, :workspaces_owner_check,
        check: "type = 'organization' OR owner_user_id IS NOT NULL"
      )
    )

    execute("""
    CREATE UNIQUE INDEX workspaces_personal_owner_idx
      ON workspaces (owner_user_id) WHERE type = 'personal'
    """)

    execute("""
    CREATE UNIQUE INDEX workspaces_professional_owner_idx
      ON workspaces (owner_user_id) WHERE type = 'professional'
    """)

    alter table(:organizations) do
      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :restrict))
      add(:kind, :text, null: false, default: "family")
      add(:status, :text, null: false, default: "active")
      add(:settings, :map, null: false, default: %{})
      add(:billing_owner_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:sponsor_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
    end

    create(unique_index(:organizations, [:workspace_id]))
    create(index(:organizations, [:kind, :status]))

    create(
      constraint(:organizations, :organizations_kind_check, check: "kind IN ('family', 'agency')")
    )

    create(
      constraint(:organizations, :organizations_status_check,
        check: "status IN ('active', 'frozen', 'archived')"
      )
    )

    execute("""
    INSERT INTO workspaces (id, type, owner_user_id, name, status, settings, created_at, updated_at)
    SELECT gen_random_uuid(), 'personal', u.id, COALESCE(NULLIF(u.name, ''), u.email), 'active',
           jsonb_build_object('migrated', true), u.created_at, u.updated_at
      FROM users u
    ON CONFLICT DO NOTHING
    """)

    execute("""
    INSERT INTO workspaces (id, type, owner_user_id, name, status, settings, created_at, updated_at)
    SELECT gen_random_uuid(), 'organization', NULL, o.name, 'active',
           jsonb_build_object('legacyOrganizationId', o.id::text), o.created_at, o.updated_at
      FROM organizations o
     WHERE o.workspace_id IS NULL
    """)

    execute("""
    UPDATE organizations o
       SET workspace_id = w.id,
           billing_owner_user_id = o.owner_id
      FROM workspaces w
     WHERE w.type = 'organization'
       AND w.settings->>'legacyOrganizationId' = o.id::text
       AND o.workspace_id IS NULL
    """)

    alter table(:organizations) do
      modify(:workspace_id, :uuid, null: false)
    end

    execute("ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey")

    execute("""
    ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
    """)

    execute(
      "ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check"
    )

    create(
      constraint(:organization_members, :organization_members_role_check,
        check: "role IN ('owner', 'admin', 'member', 'broker')"
      )
    )

    execute(
      "ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_role_check"
    )

    create(
      constraint(:organization_invites, :organization_invites_role_check,
        check: "role IN ('owner', 'admin', 'member', 'broker')"
      )
    )

    alter table(:subscriptions) do
      add(:source, :text, null: false, default: "manual")
      add(:target_workspace_id, references(:workspaces, type: :uuid, on_delete: :restrict))
      add(:grant_reason, :text)
      add(:revoked_at, :utc_datetime)
      add(:revoked_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
    end

    execute("""
    UPDATE subscriptions s
       SET source = CASE WHEN s.stripe_subscription_id IS NULL THEN 'manual' ELSE 'stripe' END,
           target_workspace_id = w.id
      FROM workspaces w
     WHERE w.type = 'personal' AND w.owner_user_id = s.user_id
    """)

    create(index(:subscriptions, [:target_workspace_id, :status]))
    create(index(:subscriptions, [:source, :status]))

    create(
      constraint(:subscriptions, :subscriptions_source_check,
        check: "source IN ('stripe', 'manual', 'trial')"
      )
    )

    create(
      constraint(:subscriptions, :subscriptions_grant_reason_check,
        check:
          "grant_reason IS NULL OR grant_reason IN ('friend', 'pilot', 'test', 'support', 'promotion', 'other')"
      )
    )

    create table(:platform_user_roles, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))
      add(:user_id, references(:users, type: :uuid, on_delete: :delete_all), null: false)
      add(:role, :text, null: false)
      add(:granted_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:granted_at, :utc_datetime, null: false, default: fragment("now()"))
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:platform_user_roles, [:user_id, :role]))
    create(index(:platform_user_roles, [:role]))

    create(
      constraint(:platform_user_roles, :platform_user_roles_role_check,
        check: "role IN ('super_admin')"
      )
    )

    execute("""
    INSERT INTO platform_user_roles (id, user_id, role, granted_at, created_at, updated_at)
    SELECT gen_random_uuid(), id, 'super_admin', now(), now(), now()
      FROM users WHERE is_admin = true
    ON CONFLICT (user_id, role) DO NOTHING
    """)

    alter table(:collections) do
      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :restrict))
      add(:created_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:responsible_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:kind, :text, null: false, default: "general")
      add(:visibility, :text, null: false, default: "private")
      add(:source_collection_id, references(:collections, type: :uuid, on_delete: :nilify_all))
      add(:tags, {:array, :text}, null: false, default: [])
      add(:status, :text, null: false, default: "active")
      add(:publication_settings, :map, null: false, default: %{})
    end

    execute("""
    UPDATE collections c
       SET workspace_id = pw.id,
           created_by_user_id = c.user_id,
           responsible_user_id = c.user_id,
           visibility = 'private'
      FROM workspaces pw
     WHERE c.user_id IS NOT NULL
       AND pw.type = 'personal'
       AND pw.owner_user_id = c.user_id
    """)

    execute("""
    UPDATE collections c
       SET workspace_id = o.workspace_id,
           created_by_user_id = o.owner_id,
           responsible_user_id = o.owner_id,
           visibility = 'team'
      FROM organizations o
     WHERE c.org_id = o.id
    """)

    alter table(:collections) do
      modify(:workspace_id, :uuid, null: false)
    end

    execute("ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_owner_check")
    create(index(:collections, [:workspace_id, :created_at]))
    create(index(:collections, [:responsible_user_id]))
    create(index(:collections, [:source_collection_id]))
    create(index(:collections, [:workspace_id, :visibility]))

    create(
      constraint(:collections, :collections_kind_check,
        check: "kind IN ('general', 'template', 'presentation')"
      )
    )

    create(
      constraint(:collections, :collections_visibility_check,
        check: "visibility IN ('private', 'team')"
      )
    )

    create(
      constraint(:collections, :collections_status_check,
        check: "status IN ('active', 'archived')"
      )
    )

    create table(:collection_access_grants, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))

      add(:collection_id, references(:collections, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:user_id, references(:users, type: :uuid, on_delete: :delete_all), null: false)
      add(:role, :text, null: false)
      add(:status, :text, null: false, default: "active")
      add(:granted_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:expires_at, :utc_datetime)
      add(:revoked_at, :utc_datetime)
      add(:revoked_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:collection_access_grants, [:collection_id, :user_id]))
    create(index(:collection_access_grants, [:user_id, :status]))

    create(
      constraint(:collection_access_grants, :collection_access_grants_role_check,
        check: "role IN ('viewer', 'editor')"
      )
    )

    create(
      constraint(:collection_access_grants, :collection_access_grants_status_check,
        check: "status IN ('active', 'revoked', 'expired')"
      )
    )

    create table(:collection_share_links, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))

      add(:collection_id, references(:collections, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:token_hash, :text, null: false)
      add(:created_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:expires_at, :utc_datetime)
      add(:revoked_at, :utc_datetime)
      add(:last_accessed_at, :utc_datetime)
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:collection_share_links, [:token_hash]))
    create(index(:collection_share_links, [:collection_id, :revoked_at]))

    execute("""
    INSERT INTO collection_share_links
      (id, collection_id, token_hash, created_by_user_id, created_at, updated_at)
    SELECT gen_random_uuid(), c.id, encode(digest(c.share_token, 'sha256'), 'hex'),
           c.created_by_user_id, c.created_at, c.updated_at
      FROM collections c
     WHERE c.is_public = true AND c.share_token IS NOT NULL
    ON CONFLICT (token_hash) DO NOTHING
    """)

    create table(:collection_collaboration_invites, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))

      add(:collection_id, references(:collections, type: :uuid, on_delete: :delete_all),
        null: false
      )

      add(:token_hash, :text, null: false)
      add(:role, :text, null: false, default: "editor")
      add(:status, :text, null: false, default: "pending")
      add(:invited_email, :text)
      add(:created_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:accepted_by_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:expires_at, :utc_datetime, null: false)
      add(:accepted_at, :utc_datetime)
      add(:revoked_at, :utc_datetime)
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:collection_collaboration_invites, [:token_hash]))
    create(index(:collection_collaboration_invites, [:collection_id, :status]))
    create(index(:collection_collaboration_invites, [:invited_email]))

    create(
      constraint(:collection_collaboration_invites, :collection_collaboration_invites_role_check,
        check: "role IN ('viewer', 'editor')"
      )
    )

    create(
      constraint(
        :collection_collaboration_invites,
        :collection_collaboration_invites_status_check,
        check: "status IN ('pending', 'accepted', 'revoked', 'expired')"
      )
    )

    create table(:audit_events, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))
      add(:actor_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :nilify_all))
      add(:action, :text, null: false)
      add(:target_type, :text, null: false)
      add(:target_id, :uuid)
      add(:before, :map)
      add(:after, :map)
      add(:metadata, :map, null: false, default: %{})
      add(:ip_address, :text)
      add(:request_id, :text)
      add(:occurred_at, :utc_datetime, null: false, default: fragment("now()"))
    end

    create(index(:audit_events, [:actor_user_id, :occurred_at]))
    create(index(:audit_events, [:workspace_id, :occurred_at]))
    create(index(:audit_events, [:target_type, :target_id]))
    create(index(:audit_events, [:action, :occurred_at]))

    create table(:ai_usage_reservations, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))
      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :restrict), null: false)
      add(:actor_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:collection_id, references(:collections, type: :uuid, on_delete: :nilify_all))
      add(:operation, :text, null: false, default: "listing_parse")
      add(:credits, :integer, null: false, default: 1)
      add(:status, :text, null: false, default: "reserved")
      add(:idempotency_key, :text, null: false)
      add(:cycle_starts_at, :utc_datetime, null: false)
      add(:cycle_ends_at, :utc_datetime, null: false)
      add(:consumed_at, :utc_datetime)
      add(:released_at, :utc_datetime)
      add(:metadata, :map, null: false, default: %{})
      timestamps(inserted_at: :created_at, updated_at: :updated_at, type: :utc_datetime)
    end

    create(unique_index(:ai_usage_reservations, [:idempotency_key]))
    create(index(:ai_usage_reservations, [:workspace_id, :cycle_starts_at, :status]))

    create(
      constraint(:ai_usage_reservations, :ai_usage_reservations_operation_check,
        check: "operation IN ('listing_parse')"
      )
    )

    create(
      constraint(:ai_usage_reservations, :ai_usage_reservations_status_check,
        check: "status IN ('reserved', 'consumed', 'released')"
      )
    )

    create(
      constraint(:ai_usage_reservations, :ai_usage_reservations_credits_check,
        check: "credits > 0"
      )
    )

    create(
      constraint(:ai_usage_reservations, :ai_usage_reservations_cycle_check,
        check: "cycle_ends_at > cycle_starts_at"
      )
    )

    create table(:ai_usage_events, primary_key: false) do
      add(:id, :uuid, primary_key: true, default: fragment("gen_random_uuid()"))

      add(:reservation_id, references(:ai_usage_reservations, type: :uuid, on_delete: :restrict),
        null: false
      )

      add(:workspace_id, references(:workspaces, type: :uuid, on_delete: :restrict), null: false)
      add(:actor_user_id, references(:users, type: :uuid, on_delete: :nilify_all))
      add(:event_type, :text, null: false)
      add(:credits_delta, :integer, null: false)
      add(:metadata, :map, null: false, default: %{})
      add(:occurred_at, :utc_datetime, null: false, default: fragment("now()"))
    end

    create(index(:ai_usage_events, [:workspace_id, :occurred_at]))
    create(index(:ai_usage_events, [:reservation_id, :occurred_at]))

    create(
      constraint(:ai_usage_events, :ai_usage_events_type_check,
        check: "event_type IN ('reserved', 'consumed', 'released')"
      )
    )

    execute("""
    INSERT INTO plans (id, name, slug, description, price_in_cents, is_active, limits, created_at, updated_at)
    VALUES
      (gen_random_uuid(), 'Free', 'free', 'Para organizar uma busca pessoal por imóveis', 0, true,
       '{"collectionsLimit":2,"listingsLimit":20,"aiParsesPerCycle":100,"canShareReadOnly":false,"canShareEditable":false,"canCreateFamily":false}'::jsonb, now(), now()),
      (gen_random_uuid(), 'Pro', 'pro', 'Para compradores e famílias buscando imóveis juntos', 2900, true,
       '{"collectionsLimit":100,"listingsLimit":1000,"aiParsesPerCycle":200,"canShareReadOnly":true,"canShareEditable":false,"canCreateFamily":true,"familyMembersLimit":4}'::jsonb, now(), now()),
      (gen_random_uuid(), 'Corretor', 'corretor', 'Para corretores autônomos', 7900, true,
       '{"collectionsLimit":250,"listingsLimit":2500,"aiParsesPerCycle":300,"canShareReadOnly":true,"canShareEditable":true,"professionalWorkspace":true}'::jsonb, now(), now()),
      (gen_random_uuid(), 'Imobiliária', 'imobiliaria', 'Para equipes de imobiliárias', 19900, true,
       '{"collectionsLimit":500,"listingsLimit":5000,"aiParsesPerCycle":500,"canShareReadOnly":true,"canShareEditable":true}'::jsonb, now(), now())
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_in_cents = EXCLUDED.price_in_cents,
      is_active = EXCLUDED.is_active,
      limits = EXCLUDED.limits,
      updated_at = now()
    """)
  end

  def down do
    drop(table(:ai_usage_events))
    drop(table(:ai_usage_reservations))
    drop(table(:audit_events))
    drop(table(:collection_collaboration_invites))
    drop(table(:collection_share_links))
    drop(table(:collection_access_grants))

    alter table(:collections) do
      remove(:publication_settings)
      remove(:status)
      remove(:tags)
      remove(:source_collection_id)
      remove(:visibility)
      remove(:kind)
      remove(:responsible_user_id)
      remove(:created_by_user_id)
      remove(:workspace_id)
    end

    create(
      constraint(:collections, :collections_owner_check,
        check:
          "(user_id IS NOT NULL AND org_id IS NULL) OR (user_id IS NULL AND org_id IS NOT NULL)"
      )
    )

    drop(table(:platform_user_roles))

    alter table(:subscriptions) do
      remove(:revoked_by_user_id)
      remove(:revoked_at)
      remove(:grant_reason)
      remove(:target_workspace_id)
      remove(:source)
    end

    execute(
      "ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check"
    )

    create(
      constraint(:organization_members, :organization_members_role_check,
        check: "role IN ('owner', 'admin', 'member')"
      )
    )

    execute(
      "ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_role_check"
    )

    create(
      constraint(:organization_invites, :organization_invites_role_check,
        check: "role IN ('owner', 'admin', 'member')"
      )
    )

    execute("ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_owner_id_fkey")

    execute("""
    ALTER TABLE organizations ADD CONSTRAINT organizations_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    """)

    alter table(:organizations) do
      remove(:sponsor_user_id)
      remove(:billing_owner_user_id)
      remove(:settings)
      remove(:status)
      remove(:kind)
      remove(:workspace_id)
    end

    drop(table(:workspaces))
  end
end
