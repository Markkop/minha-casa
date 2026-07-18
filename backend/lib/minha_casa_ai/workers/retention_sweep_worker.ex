defmodule MinhaCasaAi.Workers.RetentionSweepWorker do
  use Oban.Worker, queue: :retention, max_attempts: 3

  import Ecto.Query

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workers.WorkspaceRetentionPurgeWorker
  alias MinhaCasaAi.Workspaces.Workspace

  @batch_size 5_000

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    if Config.retention_purge_enabled?() do
      now = DateTime.utc_now(:second)
      reconcile_upgrades!(now)

      Workspace
      |> where(
        [workspace],
        workspace.retention_status == "active" and workspace.retention_expires_at <= ^now
      )
      |> order_by([workspace], asc: workspace.retention_expires_at)
      |> limit(@batch_size)
      |> select([workspace], workspace.id)
      |> Repo.all()
      |> Enum.each(fn workspace_id ->
        %{"workspace_id" => workspace_id}
        |> WorkspaceRetentionPurgeWorker.new()
        |> Oban.insert!()
      end)
    end

    :ok
  end

  @doc false
  def reconcile_upgrades!(now) do
    Ecto.Adapters.SQL.query!(
      Repo,
      """
      UPDATE workspaces AS workspace
         SET retention_plan_slug = effective.plan_slug,
             retention_expires_at = workspace.retention_last_activity_at +
               make_interval(days => retention_days_for_plan_slug(effective.plan_slug)),
             updated_at = $1::timestamptz
        FROM LATERAL (
          SELECT retention_plan_slug_for_workspace(workspace.id, $1::timestamptz) AS plan_slug
        ) AS effective
       WHERE workspace.retention_status = 'active'
         AND retention_days_for_plan_slug(effective.plan_slug) >
             retention_days_for_plan_slug(workspace.retention_plan_slug)
      """,
      [now]
    )
  end
end
