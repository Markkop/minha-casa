defmodule MinhaCasaAi.Repo.Migrations.AddRetentionFoundation do
  use Ecto.Migration

  def up do
    alter table(:users) do
      add(:last_login_at, :utc_datetime)
    end

    alter table(:workspaces) do
      add(:retention_status, :text, null: false, default: "active")

      add(:retention_last_activity_at, :utc_datetime,
        null: false,
        default: fragment("date_trunc('second', now())")
      )

      add(:retention_plan_slug, :text, null: false, default: "free")

      add(:retention_expires_at, :utc_datetime,
        null: false,
        default: fragment("date_trunc('second', now()) + interval '30 days'")
      )

      add(:content_purged_at, :utc_datetime)
    end

    execute("""
    CREATE OR REPLACE FUNCTION retention_days_for_plan_slug(plan_slug text)
    RETURNS integer
    LANGUAGE sql
    IMMUTABLE
    STRICT
    AS $$
      SELECT CASE plan_slug
        WHEN 'free' THEN 30
        WHEN 'pro' THEN 360
        WHEN 'corretor' THEN 360
        WHEN 'imobiliaria' THEN 720
        ELSE NULL
      END
    $$
    """)

    execute("""
    CREATE OR REPLACE FUNCTION retention_plan_slug_for_workspace(
      target_workspace_id uuid,
      evaluated_at timestamptz DEFAULT now()
    )
    RETURNS text
    LANGUAGE sql
    STABLE
    AS $$
      SELECT CASE workspace.type
        WHEN 'professional' THEN 'corretor'
        WHEN 'organization' THEN
          CASE organization.kind WHEN 'agency' THEN 'imobiliaria' ELSE 'pro' END
        WHEN 'personal' THEN
          CASE WHEN EXISTS (
            SELECT 1
              FROM subscriptions subscription
              JOIN plans plan ON plan.id = subscription.plan_id
             WHERE subscription.user_id = workspace.owner_user_id
               AND subscription.status = 'active'
               AND subscription.expires_at >= evaluated_at
               AND plan.slug = 'pro'
               AND (
                 subscription.target_workspace_id IS NULL OR
                 subscription.target_workspace_id = workspace.id
               )
          ) THEN 'pro' ELSE 'free' END
        ELSE 'free'
      END
        FROM workspaces workspace
        LEFT JOIN organizations organization ON organization.workspace_id = workspace.id
       WHERE workspace.id = target_workspace_id
       LIMIT 1
    $$
    """)

    execute("""
    CREATE OR REPLACE FUNCTION touch_workspace_retention(
      target_workspace_id uuid,
      plan_slug text,
      activity_at timestamptz DEFAULT now()
    )
    RETURNS boolean
    LANGUAGE plpgsql
    AS $$
    DECLARE
      normalized_activity_at timestamptz := date_trunc('second', activity_at);
      retention_days integer := retention_days_for_plan_slug(plan_slug);
      touched_rows integer := 0;
    BEGIN
      IF retention_days IS NULL THEN
        RAISE EXCEPTION 'unsupported retention plan slug: %', plan_slug;
      END IF;

      UPDATE workspaces
         SET retention_status = 'active',
             retention_last_activity_at = normalized_activity_at,
             retention_plan_slug = plan_slug,
             retention_expires_at = normalized_activity_at + make_interval(days => retention_days)
       WHERE id = target_workspace_id
         AND normalized_activity_at >= COALESCE(
           retention_last_activity_at,
           '-infinity'::timestamptz
         );

      GET DIAGNOSTICS touched_rows = ROW_COUNT;
      RETURN touched_rows > 0;
    END
    $$
    """)

    execute("""
    CREATE OR REPLACE FUNCTION refresh_retention_on_login(
      actor_user_id uuid,
      logged_in_at timestamptz DEFAULT now()
    )
    RETURNS integer
    LANGUAGE plpgsql
    AS $$
    DECLARE
      normalized_login_at timestamptz := date_trunc('second', logged_in_at);
      refreshed_workspace_count integer := 0;
    BEGIN
      UPDATE users
         SET last_login_at = GREATEST(COALESCE(last_login_at, normalized_login_at), normalized_login_at)
       WHERE id = actor_user_id;

      WITH eligible_workspaces AS (
        SELECT DISTINCT workspace.id,
               retention_plan_slug_for_workspace(workspace.id, normalized_login_at) AS plan_slug
          FROM workspaces workspace
          LEFT JOIN organizations organization ON organization.workspace_id = workspace.id
          LEFT JOIN organization_members membership
            ON membership.org_id = organization.id
           AND membership.user_id = actor_user_id
         WHERE (
           workspace.owner_user_id = actor_user_id AND
           workspace.type IN ('personal', 'professional')
         ) OR membership.user_id IS NOT NULL
      ), refreshed AS (
        UPDATE workspaces workspace
           SET retention_status = 'active',
               retention_last_activity_at = normalized_login_at,
               retention_plan_slug = eligible.plan_slug,
               retention_expires_at = normalized_login_at +
                 make_interval(days => retention_days_for_plan_slug(eligible.plan_slug))
          FROM eligible_workspaces eligible
         WHERE workspace.id = eligible.id
           AND normalized_login_at >= COALESCE(
             workspace.retention_last_activity_at,
             '-infinity'::timestamptz
           )
        RETURNING workspace.id
      )
      SELECT count(*) INTO refreshed_workspace_count FROM refreshed;

      RETURN refreshed_workspace_count;
    END
    $$
    """)

    execute("UPDATE users SET last_login_at = date_trunc('second', now())")

    execute("""
    UPDATE workspaces workspace
       SET retention_status = 'active',
           retention_last_activity_at = date_trunc('second', now()),
           retention_plan_slug = retention_plan_slug_for_workspace(workspace.id, now()),
           retention_expires_at = date_trunc('second', now()) + make_interval(
             days => retention_days_for_plan_slug(
               retention_plan_slug_for_workspace(workspace.id, now())
             )
           )
    """)

    alter table(:users) do
      modify(:last_login_at, :utc_datetime,
        null: false,
        default: fragment("date_trunc('second', now())")
      )
    end

    create(index(:users, [:last_login_at]))
    create(index(:workspaces, [:retention_expires_at]))
    create(index(:workspaces, [:retention_status, :retention_expires_at]))

    create(
      constraint(:workspaces, :workspaces_retention_status_check,
        check: "retention_status IN ('active', 'purged')"
      )
    )

    create(
      constraint(:workspaces, :workspaces_retention_plan_slug_check,
        check: "retention_plan_slug IN ('free', 'pro', 'corretor', 'imobiliaria')"
      )
    )

    create(
      constraint(:workspaces, :workspaces_retention_window_check,
        check: "retention_expires_at > retention_last_activity_at"
      )
    )
  end

  def down do
    raise "retention foundation migration is intentionally irreversible"
  end
end
