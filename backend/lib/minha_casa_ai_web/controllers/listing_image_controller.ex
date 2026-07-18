defmodule MinhaCasaAiWeb.ListingImageController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.ListingImages
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.{CollectionPolicy, CollectionSharing, Listing}
  alias MinhaCasaAi.Repo

  def ingest(conn, %{"id" => listing_id}) do
    user_id = conn.assigns[:current_user_id]
    org_id = conn.assigns[:current_org_id]
    overwrite = ingest_overwrite?(conn)

    with {:ok, listing} <-
           Listings.get_listing_by_id(listing_id, user_id: user_id, org_id: org_id),
         {:ok, _, _} <- CollectionPolicy.authorize(user_id, listing.collection_id, :add_listing),
         {:ok, result} <-
           ListingImages.enqueue_ingestion(listing_id, listing.collection_id,
             user_id: user_id,
             org_id: org_id,
             overwrite: overwrite
           ) do
      conn
      |> put_status(:accepted)
      |> json(result)
    else
      {:error, :listing_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Listing not found"})

      {:error, :collection_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Listing not found"})

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "Failed to enqueue image ingestion: #{inspect(reason)}"})
    end
  end

  def show(conn, %{"id" => listing_id, "index" => index_str}) do
    user_id = conn.assigns[:current_user_id]
    org_id = conn.assigns[:current_org_id]

    with {:ok, index} <- parse_index(index_str),
         :ok <- authorize_listing_access(listing_id, user_id, org_id),
         {:ok, body, content_type} <- ListingImages.serve_image(listing_id, index) do
      conn
      |> put_resp_content_type(content_type)
      |> put_resp_header("cache-control", "private, max-age=86400")
      |> send_resp(200, body)
    else
      {:error, :invalid_index} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid image index"})

      {:error, :listing_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Listing not found"})

      {:error, :image_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Image not found"})

      {:error, :unauthorized} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})

      {:error, _} ->
        conn |> put_status(:not_found) |> json(%{error: "Image not found"})
    end
  end

  def shared_show(conn, %{"token" => token, "listing_id" => listing_id, "index" => index_str}) do
    with {:ok, index} <- parse_index(index_str),
         :ok <- authorize_shared_listing_access(token, listing_id),
         {:ok, body, content_type} <- ListingImages.serve_image(listing_id, index) do
      conn
      |> put_resp_content_type(content_type)
      |> put_resp_header("cache-control", "public, max-age=86400")
      |> send_resp(200, body)
    else
      {:error, :invalid_index} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid image index"})

      {:error, :listing_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Listing not found"})

      {:error, :image_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Image not found"})
    end
  end

  defp parse_index(index_str) when is_binary(index_str) do
    case Integer.parse(index_str) do
      {index, ""} when index >= 0 -> {:ok, index}
      _ -> {:error, :invalid_index}
    end
  end

  defp authorize_listing_access(listing_id, user_id, _org_id) do
    case Repo.get(Listing, listing_id) do
      %Listing{} = listing when is_binary(user_id) ->
        case CollectionPolicy.authorize(user_id, listing.collection_id, :view) do
          {:ok, _, _} -> :ok
          _ -> {:error, :listing_not_found}
        end

      %Listing{} when is_nil(user_id) ->
        # Internal serve from the Svelte share proxy (secret already validated).
        case Listings.get_listing_by_id(listing_id) do
          {:ok, _} -> :ok
          error -> error
        end

      _ ->
        {:error, :listing_not_found}
    end
  end

  defp authorize_shared_listing_access(token, listing_id) do
    with {:ok, collection, _link} <- CollectionSharing.resolve_link(token),
         %Listing{} <- Repo.get_by(Listing, id: listing_id, collection_id: collection.id) do
      :ok
    else
      _ -> {:error, :listing_not_found}
    end
  end

  defp ingest_overwrite?(conn) do
    case conn.body_params do
      %{"overwrite" => true} -> true
      %{"overwrite" => "true"} -> true
      _ -> false
    end
  end
end
