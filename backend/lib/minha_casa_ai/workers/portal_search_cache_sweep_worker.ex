defmodule MinhaCasaAi.Workers.PortalSearchCacheSweepWorker do
  use Oban.Worker,
    queue: :default,
    max_attempts: 1

  alias MinhaCasaAi.PortalSearches.Cache

  @impl Oban.Worker
  def perform(_job) do
    _count = Cache.sweep_expired!()
    :ok
  end
end
