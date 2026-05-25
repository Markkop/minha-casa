defmodule MinhaCasaAiWeb.ListingNearbyController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings.Nearby

  def show(conn, %{"listing_id" => listing_id}) do
    user_id = conn.assigns[:current_user_id]
    org_id = conn.assigns[:current_org_id]

    case Nearby.for_listing(listing_id, user_id: user_id, org_id: org_id) do
      {:ok, nearby} ->
        conn
        |> put_resp_header("cache-control", "private, max-age=604800")
        |> json(%{nearby: nearby})

      {:error, :listing_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Listing not found"})
    end
  end
end
