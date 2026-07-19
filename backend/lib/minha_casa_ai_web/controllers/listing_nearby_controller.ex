defmodule MinhaCasaAiWeb.ListingNearbyController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings.Nearby
  alias MinhaCasaAiWeb.PublicError

  def show(conn, %{"listing_id" => listing_id}) do
    user_id = conn.assigns[:current_user_id]
    org_id = conn.assigns[:current_org_id]

    case Nearby.for_listing(listing_id, user_id: user_id, org_id: org_id) do
      {:ok, nearby} ->
        conn
        |> put_resp_header("cache-control", "private, max-age=604800")
        |> json(%{nearby: nearby})

      {:error, :listing_not_found} ->
        PublicError.json_error(conn, :not_found, :listing_not_found)
    end
  end
end
