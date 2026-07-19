defmodule MinhaCasaAiWeb.PropertyAnalysisController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.Workers.{PropertyAnalysisCardXrayWorker, PropertyAnalysisStepWorker}
  alias MinhaCasaAi.Workflows
  alias MinhaCasaAi.Workspace.Profile
  alias MinhaCasaAiWeb.PublicError

  def create(conn, params) do
    listing_id = Map.get(params, "listingId") || Map.get(params, "listing_id")

    if is_nil(listing_id) or listing_id == "" do
      PublicError.json_error(conn, :bad_request, "Informe o imóvel para análise.")
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

    case PropertyAnalyses.create(listing_id,
           user_id: conn.assigns[:current_user_id],
           org_id: conn.assigns[:current_org_id],
           input: input
         ) do
      {:ok, analysis} ->
        conn
        |> put_status(:accepted)
        |> json(%{analysis: analysis_json(analysis)})

      {:error, :listing_not_found} ->
        PublicError.json_error(conn, :not_found, :listing_not_found)

      {:error, reason} ->
        PublicError.json_error(conn, :unprocessable_entity, reason)
    end
  end

  def retry_step(conn, %{"id" => id, "step" => step}) do
    case profile(conn) do
      {:ok, profile} ->
        cond do
          step == "xray" ->
            PublicError.json_error(
              conn,
              :bad_request,
              "Use a opção de reanalisar ambiente na interface."
            )

          PropertyAnalyses.valid_pipeline_step?(step) ->
            do_retry_step(conn, id, step, profile)

          true ->
            PublicError.json_error(conn, :bad_request, "Etapa de análise inválida.")
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
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
        PublicError.json_error(conn, :not_found, :not_found, context: :analysis)
    end
  end

  def retry_card_xray(conn, %{"id" => id, "ambiente_id" => ambiente_id}) do
    case profile(conn) do
      {:ok, profile} ->
        do_retry_card_xray(conn, id, ambiente_id, profile)

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
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
            PublicError.json_error(conn, :not_found, "Ambiente não encontrado.")
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
        PublicError.json_error(conn, :not_found, :not_found, context: :analysis)
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
            PublicError.json_error(conn, :not_found, :not_found, context: :analysis)
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  def latest(conn, %{"listing_id" => listing_id}) do
    case profile(conn) do
      {:ok, profile} ->
        case PropertyAnalyses.latest_for_listing(listing_id, profile) do
          {:ok, nil} -> json(conn, %{analysis: nil})
          {:ok, analysis} -> json(conn, %{analysis: analysis_json(analysis)})
        end

      {:error, status, reason} ->
        PublicError.json_error(conn, status, reason)
    end
  end

  defp profile(conn) do
    case Profile.profile_from_headers(
           conn.assigns[:current_user_id],
           conn.assigns[:current_org_id],
           conn.assigns[:current_workspace_id]
         ) do
      {:error, :missing_profile} -> {:error, :unauthorized, :missing_profile}
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
      error: PublicError.public_failure_message(analysis.error),
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
      error: PublicError.public_failure_message(run.error)
    }
  end

  defp camelize_key("listing_id"), do: "listingId"
  defp camelize_key("address_override"), do: "addressOverride"
  defp camelize_key("collection_id"), do: "collectionId"
  defp camelize_key(key), do: key
end
