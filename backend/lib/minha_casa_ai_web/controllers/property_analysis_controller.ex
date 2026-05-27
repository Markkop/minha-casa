defmodule MinhaCasaAiWeb.PropertyAnalysisController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.Workers.{PropertyAnalysisCardXrayWorker, PropertyAnalysisStepWorker}
  alias MinhaCasaAi.Workflows
  alias MinhaCasaAi.Workspace.Profile

  def create(conn, params) do
    listing_id = Map.get(params, "listingId") || Map.get(params, "listing_id")

    if is_nil(listing_id) or listing_id == "" do
      conn |> put_status(:bad_request) |> json(%{error: "listingId is required"})
    else
      do_create(conn, params, listing_id)
    end
  end

  defp do_create(conn, params, listing_id) do
    input =
      params
      |> Map.take(["addressOverride", "collectionId", "orgId", "force"])
      |> Enum.map(fn {k, v} -> {camelize_key(k), v} end)
      |> Map.new()

    case PropertyAnalyses.create(listing_id, [
           user_id: conn.assigns[:current_user_id],
           org_id: conn.assigns[:current_org_id],
           input: input
         ]) do
      {:ok, analysis} ->
        conn
        |> put_status(:accepted)
        |> json(%{analysis: analysis_json(analysis)})

      {:error, :listing_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Listing not found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(reason)})
    end
  end

  def retry_step(conn, %{"id" => id, "step" => step}) do
    case profile(conn) do
      {:ok, profile} ->
        cond do
          step == "xray" ->
            conn
            |> put_status(:bad_request)
            |> json(%{error: "Use POST .../ambientes/:ambiente_id/xray/retry para reexecutar o x-ray."})

          PropertyAnalyses.valid_pipeline_step?(step) ->
            do_retry_step(conn, id, step, profile)

          true ->
            conn |> put_status(:bad_request) |> json(%{error: "Invalid step: #{step}"})
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  defp do_retry_step(conn, id, step, profile) do
    case PropertyAnalyses.get_for_profile(id, profile) do
      {:ok, analysis} ->
        if analysis.status in ["queued", "running"] do
          conn
          |> put_status(:conflict)
          |> json(%{error: "Análise completa em andamento; aguarde ou atualize a página."})
        else
          analysis = PropertyAnalyses.mark_step_running!(analysis.id, step)

          %{analysis_id: analysis.id, step: step}
          |> PropertyAnalysisStepWorker.new()
          |> Oban.insert!()

          conn
          |> put_status(:accepted)
          |> json(%{analysis: analysis_json(analysis)})
        end

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Analysis not found"})
    end
  end

  def retry_card_xray(conn, %{"id" => id, "ambiente_id" => ambiente_id}) do
    case profile(conn) do
      {:ok, profile} ->
        do_retry_card_xray(conn, id, ambiente_id, profile)

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  defp do_retry_card_xray(conn, id, ambiente_id, profile) do
    case PropertyAnalyses.get_for_profile(id, profile) do
      {:ok, analysis} ->
        if analysis.status in ["queued", "running"] do
          conn
          |> put_status(:conflict)
          |> json(%{error: "Análise completa em andamento; aguarde ou atualize a página."})
        else
          card = PropertyAnalyses.get_ambiente_card(analysis, ambiente_id)

          if is_nil(card) do
            conn |> put_status(:not_found) |> json(%{error: "Ambiente não encontrado"})
          else
            PropertyAnalyses.mark_ambiente_xray_running!(analysis.id, ambiente_id)

            %{analysis_id: analysis.id, ambiente_id: ambiente_id}
            |> PropertyAnalysisCardXrayWorker.new()
            |> Oban.insert!()

            analysis = PropertyAnalyses.get!(analysis.id)

            conn
            |> put_status(:accepted)
            |> json(%{analysis: analysis_json(analysis)})
          end
        end

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "Analysis not found"})
    end
  end

  def show(conn, %{"id" => id}) do
    case profile(conn) do
      {:ok, profile} ->
        case PropertyAnalyses.get_for_profile(id, profile) do
          {:ok, analysis} ->
            workflow =
              if analysis.workflow_run_id do
                Workflows.get_run(analysis.workflow_run_id)
              end

            json(conn, %{
              analysis: analysis_json(analysis),
              workflow: workflow_json(workflow)
            })

          {:error, :not_found} ->
            conn |> put_status(:not_found) |> json(%{error: "Analysis not found"})
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  def latest(conn, %{"listing_id" => listing_id}) do
    case profile(conn) do
      {:ok, profile} ->
        case PropertyAnalyses.latest_for_listing(listing_id, profile) do
          {:ok, nil} -> json(conn, %{analysis: nil})
          {:ok, analysis} -> json(conn, %{analysis: analysis_json(analysis)})
        end

      {:error, status, message} ->
        error(conn, status, message)
    end
  end

  defp profile(conn) do
    case Profile.profile_from_headers(
           conn.assigns[:current_user_id],
           conn.assigns[:current_org_id]
         ) do
      {:error, :missing_profile} -> {:error, :unauthorized, "Missing profile"}
      profile -> {:ok, profile}
    end
  end

  defp analysis_json(analysis) do
    %{
      id: analysis.id,
      listingId: analysis.listing_id,
      workflowRunId: analysis.workflow_run_id,
      status: analysis.status,
      input: analysis.input,
      result: analysis.result,
      error: analysis.error,
      insertedAt: analysis.created_at,
      updatedAt: analysis.updated_at
    }
  end

  defp workflow_json(nil), do: nil

  defp workflow_json(run) do
    %{
      id: run.id,
      kind: run.kind,
      status: run.status,
      result: run.result,
      error: run.error
    }
  end

  defp camelize_key("listing_id"), do: "listingId"
  defp camelize_key("address_override"), do: "addressOverride"
  defp camelize_key("collection_id"), do: "collectionId"
  defp camelize_key(key), do: key

  defp error(conn, status, message) do
    conn |> put_status(status) |> json(%{error: message})
  end
end
