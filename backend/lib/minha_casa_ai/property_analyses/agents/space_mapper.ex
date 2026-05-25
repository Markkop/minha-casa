defmodule MinhaCasaAi.PropertyAnalyses.Agents.SpaceMapper do
  @moduledoc """
  Deprecated alias: photo clustering only via PhotoSpaceCluster.
  Listing reconciliation moved to SpaceReconciler (before a single risk X-ray pass).
  """

  alias MinhaCasaAi.PropertyAnalyses.Agents.PhotoSpaceCluster

  def map(inventory, listing_data \\ %{}, location_context \\ %{}) do
    PhotoSpaceCluster.cluster(inventory, listing_data, location_context)
  end
end
