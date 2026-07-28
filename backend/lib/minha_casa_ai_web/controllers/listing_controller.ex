defmodule MinhaCasaAiWeb.ListingController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.Copy
  alias MinhaCasaAiWeb.{ListingJSON, PublicError}

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
        PublicError.json_error(conn, :not_found, :listing_not_found)
    end
  end

  def copy(conn, %{"id" => id, "targetCollectionId" => target_collection_id}) do
    case Copy.copy_listing(conn.assigns[:current_user_id], id, target_collection_id) do
      {:ok, listing} ->
        conn
        |> put_status(:created)
        |> json(%{listing: ListingJSON.listing(listing)})

      {:error, reason} when reason in [:workspace_frozen, :listing_limit, :floor_plan_limit] ->
        status = if reason == :workspace_frozen, do: :locked, else: :unprocessable_entity
        PublicError.json_error(conn, status, reason)

      {:error, reason} when reason in [:same_collection, :target_collection_inactive] ->
        PublicError.json_error(conn, :unprocessable_entity, reason)

      {:error, reason} when reason in [:listing_not_found, :target_collection_not_found] ->
        PublicError.json_error(conn, :not_found, reason)

      {:error, _reason} ->
        PublicError.json_error(conn, :conflict, "Não foi possível copiar o imóvel.")
    end
  end

  def copy(conn, %{"id" => _id}) do
    PublicError.json_error(conn, :bad_request, "targetCollectionId is required")
  end
end
