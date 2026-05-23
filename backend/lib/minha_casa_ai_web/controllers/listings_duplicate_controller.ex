defmodule MinhaCasaAiWeb.ListingsDuplicateController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings

  def check(conn, %{"collectionId" => collection_id, "data" => data}) when is_map(data) do
    user_id = conn.assigns[:current_user_id]
    org_id = conn.assigns[:current_org_id]

    with {:ok, _} <- Listings.get_collection(collection_id, user_id, org_id) do
      candidates = Listings.duplicate_candidates(collection_id, data)

      if candidates == [] do
        json(conn, %{duplicateCandidates: []})
      else
        conn
        |> put_status(:conflict)
        |> json(%{duplicateCandidates: candidates})
      end
    else
      {:error, :collection_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Collection not found"})
    end
  end

  def check(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "collectionId and data are required"})
  end
end
