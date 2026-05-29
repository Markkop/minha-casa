defmodule MinhaCasaAi.PortalSearches.Broadcast do
  @moduledoc false

  @pubsub MinhaCasaAi.PubSub

  def topic(run_id), do: "portal_search_run:#{run_id}"

  def publish(run_id, event, payload \\ %{}) do
    Phoenix.PubSub.broadcast(@pubsub, topic(run_id), {event, payload})
  end
end
