defmodule MinhaCasaAiWeb.ListingController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings
  alias MinhaCasaAiWeb.ListingJSON

  def show(conn, %{"id" => id}) do
    case Listings.get_listing_for_workspace(
           id,
           conn.assigns[:current_user_id],
           conn.assigns[:current_workspace_id]
         ) do
      {:ok, listing, collection, access} ->
        json(conn, %{
          listing: ListingJSON.listing(listing),
          collection: ListingJSON.collection(collection),
          access: access
        })

      {:error, _reason} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Listing not found"})
    end
  end
end
