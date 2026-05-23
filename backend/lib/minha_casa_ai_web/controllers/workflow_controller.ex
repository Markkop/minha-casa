defmodule MinhaCasaAiWeb.WorkflowController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Workflows
  alias MinhaCasaAi.Listings

  def create(conn, params) do
    input = Map.get(params, "input", params)

    case Workflows.create_ingestion(%{
           input: input,
           user_id: conn.assigns[:current_user_id],
           org_id: conn.assigns[:current_org_id]
         }) do
      {:ok, run} ->
        conn
        |> put_status(:accepted)
        |> json(%{workflow: workflow_json(run)})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: inspect(reason)})
    end
  end

  def show(conn, %{"id" => id}) do
    case Workflows.get_run(id) do
      nil ->
        conn |> put_status(:not_found) |> json(%{error: "Workflow not found"})

      run ->
        json(conn, %{workflow: workflow_json(run)})
    end
  end

  def confirm(conn, %{"id" => id, "collectionId" => collection_id} = params) do
    index = parse_index(Map.get(params, "listingIndex", 0))

    with run when not is_nil(run) <- Workflows.get_run(id),
         listings when is_list(listings) <- get_in(run.result || %{}, ["listings"]),
         listing when is_map(listing) <- Enum.at(listings, index),
         [] <- Listings.duplicate_candidates(collection_id, listing),
         {:ok, saved} <-
           Listings.save_listing(collection_id, listing,
             user_id: conn.assigns[:current_user_id],
             org_id: conn.assigns[:current_org_id]
           ) do
      json(conn, %{listing: %{id: saved.id, collectionId: saved.collection_id, data: saved.data}})
    else
      nil ->
        conn |> put_status(:not_found) |> json(%{error: "Workflow not found"})

      candidates when is_list(candidates) ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "Duplicate candidates found", duplicateCandidates: candidates})

      {:error, :collection_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Collection not found"})

      _ ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Workflow result is not ready"})
    end
  end

  defp workflow_json(run) do
    %{
      id: run.id,
      kind: run.kind,
      status: run.status,
      input: run.input,
      result: run.result,
      error: run.error,
      insertedAt: run.inserted_at,
      updatedAt: run.updated_at
    }
  end

  defp parse_index(index) when is_integer(index), do: index

  defp parse_index(index) when is_binary(index) do
    case Integer.parse(index) do
      {parsed, ""} -> parsed
      _ -> 0
    end
  end

  defp parse_index(_), do: 0
end
