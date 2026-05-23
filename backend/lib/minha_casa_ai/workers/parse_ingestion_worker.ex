defmodule MinhaCasaAi.Workers.ParseIngestionWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 3,
    unique: [period: 60, fields: [:args, :worker]]

  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Workflows

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"workflow_id" => workflow_id}}) do
    run = Workflows.get_run(workflow_id)

    if is_nil(run) do
      {:cancel, "workflow not found"}
    else
      Workflows.mark_processing!(run)

      case ListingParser.parse(run.input) do
        {:ok, listings} ->
          Workflows.mark_ready!(run, %{"listings" => listings})
          :ok

        {:error, reason} ->
          Workflows.mark_failed!(run, RuntimeError.exception(to_string(reason)))
          {:error, reason}
      end
    end
  end
end
