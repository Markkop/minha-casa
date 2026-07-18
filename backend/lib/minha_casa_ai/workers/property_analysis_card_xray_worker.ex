defmodule MinhaCasaAi.Workers.PropertyAnalysisCardXrayWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 2,
    unique: [period: 60, fields: [:args, :worker]]

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.PropertyAnalyses.HermesPipeline

  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{"analysis_id" => analysis_id, "ambiente_id" => ambiente_id} = args
      }) do
    analysis = PropertyAnalyses.get!(analysis_id)
    listing_id = analysis.input["listingId"] || analysis.listing_id

    with {:ok, listing} <-
           Listings.get_listing_by_id(listing_id,
             user_id: analysis.user_id,
             org_id: analysis.org_id
           ) do
      run_xray(analysis, listing, ambiente_id, trace_id: args["trace_id"])
    else
      {:error, :listing_not_found} ->
        PropertyAnalyses.mark_ambiente_xray_failed!(
          analysis_id,
          ambiente_id,
          "Imóvel não encontrado"
        )

        {:cancel, "listing not found"}
    end
  end

  defp run_xray(analysis, listing, ambiente_id, opts) do
    cond do
      not Config.configured?(:hermes) ->
        PropertyAnalyses.mark_ambiente_xray_failed!(
          analysis.id,
          ambiente_id,
          "Hermes não configurado (HERMES_API_URL / HERMES_API_KEY)"
        )

        {:error, :hermes_not_configured}

      not Config.configured?(:openai) ->
        PropertyAnalyses.mark_ambiente_xray_failed!(
          analysis.id,
          ambiente_id,
          "OPENAI_API_KEY ausente — necessário para o Hermes executar as etapas de análise."
        )

        {:error, :openai_not_configured}

      true ->
        case HermesPipeline.run_card_xray(analysis, listing, ambiente_id,
               trace_id: Keyword.get(opts, :trace_id)
             ) do
          {:ok, _pontos} -> :ok
          {:error, :ambiente_not_found} -> {:cancel, "ambiente not found"}
          {:error, reason} -> {:error, reason}
        end
    end
  end
end
