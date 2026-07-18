defmodule MinhaCasaAi.Workers.PropertyAnalysisWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 2,
    unique: [period: 120, fields: [:args, :worker]]

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.PropertyAnalyses.HermesPipeline
  alias MinhaCasaAi.Workflows

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"analysis_id" => analysis_id} = args}) do
    analysis = PropertyAnalyses.get!(analysis_id)
    PropertyAnalyses.mark_running!(analysis)

    case Workflows.get_run(analysis.workflow_run_id) do
      nil -> {:cancel, "workflow not found"}
      run -> Workflows.mark_processing!(run)
    end

    listing_id = analysis.input["listingId"] || analysis.listing_id

    with {:ok, listing} <-
           Listings.get_listing_by_id(listing_id,
             user_id: analysis.user_id,
             org_id: analysis.org_id
           ) do
      run_pipeline(analysis, listing, trace_id: args["trace_id"])
    else
      {:error, :listing_not_found} ->
        PropertyAnalyses.mark_failed!(analysis, "Imóvel não encontrado")
        {:cancel, "listing not found"}
    end
  end

  defp run_pipeline(analysis, listing, opts) do
    cond do
      not Config.configured?(:hermes) ->
        PropertyAnalyses.mark_failed!(
          analysis,
          "Hermes não configurado (HERMES_API_URL / HERMES_API_KEY)"
        )

        {:error, :hermes_not_configured}

      not Config.configured?(:openai) ->
        PropertyAnalyses.mark_failed!(
          analysis,
          "OPENAI_API_KEY ausente — necessário para o Hermes executar as etapas de análise."
        )

        {:error, :openai_not_configured}

      true ->
        run_hermes_pipeline(analysis, listing, opts)
    end
  rescue
    e ->
      analysis = PropertyAnalyses.get!(analysis.id)
      message = Exception.format(:error, e, __STACKTRACE__)
      PropertyAnalyses.mark_failed!(analysis, message)
      {:error, e}
  end

  defp run_hermes_pipeline(analysis, listing, opts) do
    case HermesPipeline.run(analysis, listing, trace_id: Keyword.get(opts, :trace_id)) do
      {:ok, _result} ->
        analysis = PropertyAnalyses.get!(analysis.id)
        PropertyAnalyses.mark_completed!(analysis)
        PropertyAnalyses.sync_workflow_result!(analysis)

        if run = Workflows.get_run(analysis.workflow_run_id) do
          Workflows.mark_ready!(run, analysis.result || %{})
        end

        :ok

      {:error, {:all_steps_failed, message}} ->
        analysis = PropertyAnalyses.get!(analysis.id)
        PropertyAnalyses.mark_failed!(analysis, message)
        {:error, :all_steps_failed}

      {:error, reason} ->
        raise "Hermes analysis failed: #{inspect(reason)}"
    end
  end
end
