defmodule MinhaCasaAi.Workers.ListingMergePreparationWorker do
  use Oban.Worker,
    queue: :images,
    max_attempts: 2,
    unique: [period: 60, fields: [:args, :worker]]

  alias MinhaCasaAi.Listings.MergeSessions

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"session_id" => session_id}}) do
    MergeSessions.prepare(session_id)
  end
end
