defmodule MinhaCasaAi.Workflows do
  import Ecto.Query

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workflows.WorkflowRun
  alias MinhaCasaAi.Workers.ParseIngestionWorker

  def create_ingestion(attrs) do
    Repo.transaction(fn ->
      run =
        %WorkflowRun{}
        |> WorkflowRun.changeset(%{
          kind: "listing_ingestion",
          status: "received",
          input: Map.get(attrs, :input, %{}),
          user_id: Map.get(attrs, :user_id),
          org_id: Map.get(attrs, :org_id)
        })
        |> Repo.insert!()

      %{workflow_id: run.id}
      |> ParseIngestionWorker.new()
      |> Oban.insert!()

      run
    end)
  end

  def get_run(id), do: Repo.get(WorkflowRun, id)

  def mark_processing!(%WorkflowRun{} = run) do
    update!(run, %{status: "extracting", error: nil})
  end

  def mark_ready!(%WorkflowRun{} = run, result) do
    update!(run, %{status: "ready_to_save", result: result, error: nil})
  end

  def mark_failed!(%WorkflowRun{} = run, error) do
    update!(run, %{status: "failed", error: Exception.message(error)})
  end

  def list_recent(limit \\ 50) do
    WorkflowRun
    |> order_by(desc: :inserted_at)
    |> limit(^limit)
    |> Repo.all()
  end

  defp update!(run, attrs) do
    run |> WorkflowRun.changeset(attrs) |> Repo.update!()
  end
end
