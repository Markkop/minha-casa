defmodule MinhaCasaAiWeb.ListingEnvironmentController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Listings.ListingMedia
  alias MinhaCasaAiWeb.{ListingEnvironmentJSON, PublicError}

  def index(conn, %{"id" => collection_id, "listing_id" => listing_id}) do
    case ListingMedia.list(collection_id, listing_id, current_profile(conn)) do
      {:ok, media} -> json(conn, ListingEnvironmentJSON.index(media))
      {:error, _} -> not_found(conn)
    end
  end

  def create(conn, %{"id" => collection_id, "listing_id" => listing_id} = params) do
    attrs = Map.get(params, "environment", params)

    case ListingMedia.create_environment(
           collection_id,
           listing_id,
           current_profile(conn),
           attrs
         ) do
      {:ok, environment} ->
        conn
        |> put_status(:created)
        |> json(ListingEnvironmentJSON.show(environment))

      {:error, :listing_not_found} ->
        not_found(conn)

      {:error, :workspace_frozen} ->
        PublicError.json_error(conn, :locked, :workspace_frozen)

      {:error, reason} ->
        invalid(conn, reason)
    end
  end

  def replace(conn, %{"id" => collection_id, "listing_id" => listing_id} = params) do
    case ListingMedia.replace_environments(
           collection_id,
           listing_id,
           current_profile(conn),
           params
         ) do
      {:ok, media} ->
        json(conn, ListingEnvironmentJSON.index(media))

      {:error, :listing_not_found} ->
        not_found(conn)

      {:error, :workspace_frozen} ->
        PublicError.json_error(conn, :locked, :workspace_frozen)

      {:error, reason} ->
        invalid(conn, reason)
    end
  end

  def update(
        conn,
        %{
          "id" => collection_id,
          "listing_id" => listing_id,
          "environment_id" => environment_id
        } = params
      ) do
    attrs = Map.get(params, "environment", params)

    case ListingMedia.update_environment(
           collection_id,
           listing_id,
           environment_id,
           current_profile(conn),
           attrs
         ) do
      {:ok, environment} ->
        json(conn, ListingEnvironmentJSON.show(environment))

      {:error, reason} when reason in [:listing_not_found, :environment_not_found] ->
        not_found(conn)

      {:error, :workspace_frozen} ->
        PublicError.json_error(conn, :locked, :workspace_frozen)

      {:error, reason} ->
        invalid(conn, reason)
    end
  end

  def delete(conn, %{
        "id" => collection_id,
        "listing_id" => listing_id,
        "environment_id" => environment_id
      }) do
    case ListingMedia.delete_environment(
           collection_id,
           listing_id,
           environment_id,
           current_profile(conn)
         ) do
      {:ok, :ok} ->
        json(conn, ListingEnvironmentJSON.deleted())

      {:error, reason} when reason in [:listing_not_found, :environment_not_found] ->
        not_found(conn)

      {:error, :workspace_frozen} ->
        PublicError.json_error(conn, :locked, :workspace_frozen)

      {:error, reason} ->
        invalid(conn, reason)
    end
  end

  defp current_profile(conn),
    do: %{
      user_id: conn.assigns[:current_user_id],
      org_id: conn.assigns[:current_org_id],
      workspace_id: conn.assigns[:current_workspace_id]
    }

  defp not_found(conn), do: PublicError.json_error(conn, :not_found, :listing_not_found)

  defp invalid(conn, %Ecto.Changeset{} = changeset),
    do: PublicError.json_error(conn, :unprocessable_entity, changeset)

  defp invalid(conn, reason),
    do: PublicError.json_error(conn, :unprocessable_entity, reason)
end
