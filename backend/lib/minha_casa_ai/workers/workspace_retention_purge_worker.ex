defmodule MinhaCasaAi.Workers.WorkspaceRetentionPurgeWorker do
  use Oban.Worker,
    queue: :retention,
    max_attempts: 10,
    unique: [period: 86_400, fields: [:worker, :args]]

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Retention.Purge

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"workspace_id" => workspace_id}}) do
    if Config.retention_purge_enabled?() do
      case Purge.purge_workspace(workspace_id) do
        {:ok, _result} -> :ok
        {:error, :workspace_not_found} -> {:cancel, "workspace not found"}
        {:error, reason} -> {:error, reason}
      end
    else
      :ok
    end
  end
end
