defmodule MinhaCasaAi.Workers.ListingMergeSessionSweepWorker do
  use Oban.Worker, queue: :default, max_attempts: 1

  alias MinhaCasaAi.Listings.MergeSessions

  @impl Oban.Worker
  def perform(_job) do
    MergeSessions.sweep_expired()
    :ok
  end
end
