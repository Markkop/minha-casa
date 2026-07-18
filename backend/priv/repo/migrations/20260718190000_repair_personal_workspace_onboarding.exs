defmodule MinhaCasaAi.Repo.Migrations.RepairPersonalWorkspaceOnboarding do
  use Ecto.Migration

  def up do
    # Keep account creation and collection writes from racing the backfill or the
    # unique index while this transactional migration is running.
    execute("LOCK TABLE users, workspaces, collections IN SHARE ROW EXCLUSIVE MODE")

    execute("""
    WITH migration_clock AS (
      SELECT date_trunc('second', now()) AS activity_at
    ), missing_personal_workspaces AS (
      SELECT user_account.id AS owner_user_id,
             COALESCE(NULLIF(btrim(user_account.name), ''), user_account.email) AS workspace_name,
             CASE WHEN EXISTS (
               SELECT 1
                 FROM subscriptions AS subscription
                 JOIN plans AS plan ON plan.id = subscription.plan_id
                WHERE subscription.user_id = user_account.id
                  AND subscription.status = 'active'
                  AND subscription.expires_at >= migration_clock.activity_at
                  AND subscription.target_workspace_id IS NULL
                  AND plan.slug = 'pro'
             ) THEN 'pro' ELSE 'free' END AS retention_plan_slug,
             migration_clock.activity_at
        FROM users AS user_account
        CROSS JOIN migration_clock
       WHERE NOT EXISTS (
         SELECT 1
           FROM workspaces AS workspace
          WHERE workspace.type = 'personal'
            AND workspace.owner_user_id = user_account.id
       )
    )
    INSERT INTO workspaces (
      id,
      type,
      owner_user_id,
      name,
      status,
      settings,
      retention_status,
      retention_last_activity_at,
      retention_plan_slug,
      retention_expires_at,
      content_purged_at,
      created_at,
      updated_at
    )
    SELECT gen_random_uuid(),
           'personal',
           missing.owner_user_id,
           missing.workspace_name,
           'active',
           '{}'::jsonb,
           'active',
           missing.activity_at,
           missing.retention_plan_slug,
           missing.activity_at + make_interval(
             days => retention_days_for_plan_slug(missing.retention_plan_slug)
           ),
           NULL,
           missing.activity_at,
           missing.activity_at
      FROM missing_personal_workspaces AS missing
    ON CONFLICT DO NOTHING
    """)

    # Normalize every workspace before adding the global partial unique index.
    # The oldest default wins, with UUID providing a stable tie-breaker.
    execute("""
    WITH ranked_defaults AS (
      SELECT collection.id,
             row_number() OVER (
               PARTITION BY collection.workspace_id
               ORDER BY collection.created_at ASC, collection.id ASC
             ) AS default_rank
        FROM collections AS collection
       WHERE collection.is_default = true
    )
    UPDATE collections AS collection
       SET is_default = false,
           updated_at = now()
      FROM ranked_defaults AS ranked
     WHERE collection.id = ranked.id
       AND ranked.default_rank > 1
    """)

    # A personal default is useful only while active. An archived default must
    # not prevent promotion of an existing active collection or starter setup.
    execute("""
    UPDATE collections AS collection
       SET is_default = false,
           updated_at = now()
      FROM workspaces AS workspace
     WHERE collection.workspace_id = workspace.id
       AND workspace.type = 'personal'
       AND collection.is_default = true
       AND collection.status <> 'active'
    """)

    execute("""
    WITH promotion_candidates AS (
      SELECT DISTINCT ON (collection.workspace_id)
             collection.id
        FROM collections AS collection
        JOIN workspaces AS workspace ON workspace.id = collection.workspace_id
       WHERE workspace.type = 'personal'
         AND collection.status = 'active'
         AND NOT EXISTS (
           SELECT 1
             FROM collections AS current_default
            WHERE current_default.workspace_id = collection.workspace_id
              AND current_default.is_default = true
         )
       ORDER BY collection.workspace_id, collection.created_at ASC, collection.id ASC
    )
    UPDATE collections AS collection
       SET is_default = true,
           updated_at = now()
      FROM promotion_candidates AS candidate
     WHERE collection.id = candidate.id
    """)

    execute("""
    INSERT INTO collections (
      id,
      user_id,
      org_id,
      workspace_id,
      created_by_user_id,
      responsible_user_id,
      name,
      is_public,
      share_token,
      is_default,
      kind,
      visibility,
      source_collection_id,
      tags,
      status,
      publication_settings,
      created_at,
      updated_at
    )
    SELECT gen_random_uuid(),
           workspace.owner_user_id,
           NULL,
           workspace.id,
           workspace.owner_user_id,
           workspace.owner_user_id,
           format('Meus Imóveis %s', extract(year FROM current_date)::integer),
           false,
           NULL,
           true,
           'general',
           'private',
           NULL,
           ARRAY[]::text[],
           'active',
           '{}'::jsonb,
           now(),
           now()
      FROM workspaces AS workspace
     WHERE workspace.type = 'personal'
       AND NOT EXISTS (
         SELECT 1
           FROM collections AS current_default
          WHERE current_default.workspace_id = workspace.id
            AND current_default.is_default = true
       )
    """)

    execute("""
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
          FROM users AS user_account
         WHERE NOT EXISTS (
           SELECT 1
             FROM workspaces AS workspace
            WHERE workspace.type = 'personal'
              AND workspace.owner_user_id = user_account.id
         )
      ) THEN
        RAISE EXCEPTION 'personal workspace onboarding repair left users without a personal workspace';
      END IF;

      IF EXISTS (
        SELECT 1
          FROM workspaces AS workspace
         WHERE workspace.type = 'personal'
           AND NOT EXISTS (
             SELECT 1
               FROM collections AS collection
              WHERE collection.workspace_id = workspace.id
                AND collection.is_default = true
                AND collection.status = 'active'
           )
      ) THEN
        RAISE EXCEPTION 'personal workspace onboarding repair left personal workspaces without an active default collection';
      END IF;

      IF EXISTS (
        SELECT collection.workspace_id
          FROM collections AS collection
         WHERE collection.is_default = true
         GROUP BY collection.workspace_id
        HAVING count(*) > 1
      ) THEN
        RAISE EXCEPTION 'personal workspace onboarding repair left workspaces with duplicate defaults';
      END IF;
    END
    $$
    """)

    create(
      unique_index(:collections, [:workspace_id],
        name: :collections_one_default_per_workspace_idx,
        where: "is_default = true"
      )
    )
  end

  def down do
    drop(index(:collections, [:workspace_id], name: :collections_one_default_per_workspace_idx))
  end
end
