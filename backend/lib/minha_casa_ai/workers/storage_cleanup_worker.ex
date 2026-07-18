defmodule MinhaCasaAi.Workers.StorageCleanupWorker do
  use Oban.Worker, queue: :storage, max_attempts: 10

  alias MinhaCasaAi.ListingImages.Storage

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    keys = Map.get(args, "keys", [])
    prefixes = Map.get(args, "prefixes", [])

    case Storage.delete_targets(keys, prefixes) do
      :ok -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  @impl Oban.Worker
  def backoff(%Oban.Job{attempt: attempt}) do
    trunc(:math.pow(2, min(attempt, 8)) * 15)
  end
end
