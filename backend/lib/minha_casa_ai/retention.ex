defmodule MinhaCasaAi.Retention do
  @moduledoc "Workspace retention activity operations backed by database functions."

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace

  def initialize_workspace(%Workspace{id: workspace_id}) do
    initialize_workspace(workspace_id)
  end

  def initialize_workspace(workspace_id) when is_binary(workspace_id) do
    record_activity(workspace_id)
  end

  def initialize_workspace(_workspace_id), do: {:error, :invalid_workspace}

  @doc "Renews a workspace using its current effective tier."
  def record_activity(workspace_id, activity_at \\ DateTime.utc_now(:second))

  def record_activity(workspace_id, %DateTime{} = activity_at) when is_binary(workspace_id) do
    case Ecto.Adapters.SQL.query(
           Repo,
           """
           SELECT touch_workspace_retention(
             $1::uuid,
             retention_plan_slug_for_workspace($1::uuid, $2::timestamptz),
             $2::timestamptz
           )
           """,
           [Ecto.UUID.dump!(workspace_id), activity_at]
         ) do
      {:ok, %{rows: [[true]]}} -> :ok
      {:ok, %{rows: [[false]]}} -> {:error, :workspace_not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  def record_activity(_workspace_id, _activity_at), do: {:error, :invalid_workspace}

  def touch_workspace(workspace_id, plan_slug, activity_at \\ DateTime.utc_now(:second))

  def touch_workspace(workspace_id, plan_slug, %DateTime{} = activity_at)
      when is_binary(workspace_id) and is_binary(plan_slug) do
    case Ecto.Adapters.SQL.query(
           Repo,
           "SELECT touch_workspace_retention($1::uuid, $2::text, $3::timestamptz)",
           [Ecto.UUID.dump!(workspace_id), plan_slug, activity_at]
         ) do
      {:ok, %{rows: [[true]]}} -> :ok
      {:ok, %{rows: [[false]]}} -> {:error, :stale_activity}
      {:error, reason} -> {:error, reason}
    end
  end

  def touch_workspace(_workspace_id, _plan_slug, _activity_at),
    do: {:error, :invalid_retention_activity}
end
