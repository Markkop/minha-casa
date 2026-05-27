defmodule MinhaCasaAi.Workers.PropertyAnalysisStepWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 2,
    unique: [period: 60, fields: [:args, :worker]]

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.PropertyAnalyses.HermesPipeline

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"analysis_id" => analysis_id, "step" => step}}) do
    analysis = PropertyAnalyses.get!(analysis_id)
    listing_id = analysis.input["listingId"] || analysis.listing_id

    with {:ok, listing} <-
           Listings.get_listing_by_id(listing_id,
             user_id: analysis.user_id,
             org_id: analysis.org_id
           ) do
      run_step(analysis, listing, step)
    else
      {:error, :listing_not_found} ->
        PropertyAnalyses.mark_step_failed!(analysis_id, step, "Imóvel não encontrado")
        {:cancel, "listing not found"}
    end
  end

  defp run_step(analysis, listing, step) do
    cond do
      not Config.configured?(:hermes) ->
        PropertyAnalyses.mark_step_failed!(
          analysis.id,
          step,
          "Hermes não configurado (HERMES_API_URL / HERMES_API_KEY)"
        )

        {:error, :hermes_not_configured}

      not Config.configured?(:openai) ->
        PropertyAnalyses.mark_step_failed!(
          analysis.id,
          step,
          "OPENAI_API_KEY ausente — necessário para o Hermes executar as etapas de análise."
        )

        {:error, :openai_not_configured}

      not PropertyAnalyses.valid_pipeline_step?(step) ->
        {:cancel, "invalid step"}

      true ->
        case HermesPipeline.run_single_step(analysis, listing, step) do
          {:ok, _section} ->
            :ok

          {:error, :invalid_step} ->
            {:cancel, "invalid step"}

          {:error, reason} ->
            {:error, reason}
        end
    end
  rescue
    e ->
      PropertyAnalyses.mark_step_failed!(analysis.id, step, Exception.message(e))
      {:error, e}
  end
end
