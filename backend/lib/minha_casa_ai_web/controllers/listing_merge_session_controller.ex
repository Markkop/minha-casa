defmodule MinhaCasaAiWeb.ListingMergeSessionController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings.MergeSessions

  def create(conn, %{"collectionId" => collection_id, "data" => data} = params)
      when is_map(data) do
    opts = profile_opts(conn, target_listing_id: params["targetListingId"])

    case MergeSessions.create(collection_id, data, opts) do
      {:ok, session} ->
        conn
        |> put_status(:accepted)
        |> json(%{mergeSession: MergeSessions.session_json(session)})

      {:error, :duplicate_not_found} ->
        conn |> put_status(:conflict) |> json(%{error: "Duplicate target not found"})

      {:error, :collection_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Collection not found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(reason)})
    end
  end

  def create(conn, _params),
    do: conn |> put_status(:bad_request) |> json(%{error: "collectionId and data are required"})

  def show(conn, %{"id" => id}) do
    case MergeSessions.get(id, profile_opts(conn)) do
      nil -> conn |> put_status(:not_found) |> json(%{error: "Merge session not found"})
      session -> json(conn, %{mergeSession: MergeSessions.session_json(session)})
    end
  end

  def apply_merge(conn, %{"id" => id} = params) do
    case MergeSessions.apply(id, params, profile_opts(conn)) do
      {:ok, listing} ->
        json(conn, %{listing: MinhaCasaAiWeb.ListingJSON.listing(listing)})

      {:error, :stale_listing} ->
        conn |> put_status(:conflict) |> json(%{error: "Listing changed since preview"})

      {:error, :session_expired} ->
        conn |> put_status(:gone) |> json(%{error: "Merge session expired"})

      {:error, :session_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Merge session not found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(reason)})
    end
  end

  def delete(conn, %{"id" => id}) do
    case MergeSessions.cancel(id, profile_opts(conn)) do
      :ok ->
        json(conn, %{success: true})

      {:error, :session_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Merge session not found"})
    end
  end

  def image(conn, %{"id" => id, "image_id" => image_id}) do
    case MergeSessions.preview_image(id, image_id, profile_opts(conn)) do
      {:ok, bytes, content_type} ->
        conn
        |> put_resp_content_type(content_type)
        |> put_resp_header("cache-control", "private, max-age=300")
        |> send_resp(200, bytes)

      {:error, _} ->
        conn |> put_status(:not_found) |> json(%{error: "Image not found"})
    end
  end

  defp profile_opts(conn, extra \\ []) do
    [
      user_id: conn.assigns[:current_user_id],
      org_id: conn.assigns[:current_org_id]
    ] ++ extra
  end
end
