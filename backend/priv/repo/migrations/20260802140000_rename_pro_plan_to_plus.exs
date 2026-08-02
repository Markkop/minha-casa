defmodule MinhaCasaAi.Repo.Migrations.RenameProPlanToPlus do
  use Ecto.Migration

  def up do
    execute("""
    UPDATE plans
       SET slug = 'plus',
           name = 'Plus'
     WHERE slug = 'pro'
    """)

    execute("""
    CREATE OR REPLACE FUNCTION retention_days_for_plan_slug(plan_slug text)
    RETURNS integer
    LANGUAGE sql
    IMMUTABLE
    STRICT
    AS $$
      SELECT CASE plan_slug
        WHEN 'free' THEN 30
        WHEN 'plus' THEN 360
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
          CASE organization.kind WHEN 'agency' THEN 'imobiliaria' ELSE 'plus' END
        WHEN 'personal' THEN
          CASE WHEN EXISTS (
            SELECT 1
              FROM subscriptions subscription
              JOIN plans plan ON plan.id = subscription.plan_id
             WHERE subscription.user_id = workspace.owner_user_id
               AND subscription.status = 'active'
               AND subscription.expires_at >= evaluated_at
               AND plan.slug = 'plus'
               AND (
                 subscription.target_workspace_id IS NULL OR
                 subscription.target_workspace_id = workspace.id
               )
          ) THEN 'plus' ELSE 'free' END
        ELSE 'free'
      END
        FROM workspaces workspace
        LEFT JOIN organizations organization ON organization.workspace_id = workspace.id
       WHERE workspace.id = target_workspace_id
       LIMIT 1
    $$
    """)

    drop(constraint(:workspaces, :workspaces_retention_plan_slug_check))

    execute("""
    UPDATE workspaces
       SET retention_plan_slug = 'plus'
     WHERE retention_plan_slug = 'pro'
    """)

    create(
      constraint(:workspaces, :workspaces_retention_plan_slug_check,
        check: "retention_plan_slug IN ('free', 'plus', 'corretor', 'imobiliaria')"
      )
    )
  end

  def down do
    drop(constraint(:workspaces, :workspaces_retention_plan_slug_check))

    execute("""
    UPDATE workspaces
       SET retention_plan_slug = 'pro'
     WHERE retention_plan_slug = 'plus'
    """)

    create(
      constraint(:workspaces, :workspaces_retention_plan_slug_check,
        check: "retention_plan_slug IN ('free', 'pro', 'corretor', 'imobiliaria')"
      )
    )

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
    UPDATE plans
       SET slug = 'pro',
           name = 'Pro'
     WHERE slug = 'plus'
    """)
  end
end
