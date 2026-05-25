defmodule MinhaCasaAi.Workers.PropertyAnalysisWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 2,
    unique: [period: 120, fields: [:args, :worker]]

  alias MinhaCasaAi.Integrations.PropertyPhotoAnalyzer
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.PropertyAnalyses.Agents.{PhotoSpaceCluster, SpaceReconciler}
  alias MinhaCasaAi.PropertyAnalyses.{GeocodeStep, LocationContext, MarketContext, RiskXrayPipeline}
  alias MinhaCasaAi.Workflows
  alias MinhaCasaAi.Workspace.Profile

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"analysis_id" => analysis_id}}) do
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
      run_pipeline(analysis, listing)
    else
      {:error, :listing_not_found} ->
        PropertyAnalyses.mark_failed!(analysis, "Imóvel não encontrado")
        {:cancel, "listing not found"}
    end
  end

  defp run_pipeline(analysis, listing) do
    data = listing.data || %{}
    input = analysis.input || %{}
    profile = profile_from_analysis(analysis)

    analysis =
      analysis
      |> step_geocode(data, input)
      |> step_market_context(data, profile)
      |> step_inventory(listing.id, data)
      |> step_photo_cluster(data)
      |> step_space_reconciliation(data)
      |> step_risk_xray(data)

    PropertyAnalyses.mark_completed!(analysis)
    PropertyAnalyses.sync_workflow_result!(analysis)

    run = Workflows.get_run(analysis.workflow_run_id)

    if run do
      Workflows.mark_ready!(run, analysis.result || %{})
    end

    :ok
  rescue
    e ->
      analysis = PropertyAnalyses.get!(analysis.id)
      message = Exception.format(:error, e, __STACKTRACE__)
      PropertyAnalyses.mark_failed!(analysis, message)
      {:error, e}
  end

  defp step_geocode(analysis, data, input) do
    run_step(analysis, "geocode", fn ->
      case GeocodeStep.run(data, input) do
        {:ok, geocode} -> geocode
        {:error, reason} -> %{"skipped" => true, "reason" => to_string(reason)}
      end
    end)
  end

  defp step_market_context(analysis, data, profile) do
    geocode = Map.get(analysis.result || %{}, "geocode") || %{}

    market =
      try do
        MarketContext.build(data, profile, data["regionId"])
      rescue
        e -> %{"skipped" => true, "reason" => "step_error", "error" => Exception.message(e)}
      end

    analysis = run_step(analysis, "market", fn -> market end)
    location_ctx = LocationContext.build(geocode, data, market)

    run_step(analysis, "locationContext", fn -> location_ctx end)
  end

  defp step_inventory(analysis, listing_id, data) do
    run_step(analysis, "inventory", fn ->
      PropertyPhotoAnalyzer.analyze_listing_images(listing_id, data)
    end)
  end

  defp step_photo_cluster(analysis, data) do
    analysis = PropertyAnalyses.get!(analysis.id)
    inventory = Map.get(analysis.result || %{}, "inventory") || %{}
    location_context = Map.get(analysis.result || %{}, "locationContext") || %{}

    if Map.get(inventory, "skipped") == true do
      audit = skipped_cluster_audit(Map.get(inventory, "reason") || "no_images")
      analysis = PropertyAnalyses.apply_space_audit!(analysis, audit)
      mark_cluster_steps_complete!(analysis)
    else
      audit =
        if Config.configured?(:openai) do
          case PhotoSpaceCluster.cluster(inventory, data, location_context) do
            {:ok, result} -> result
            {:error, _} -> skipped_cluster_audit("photo_cluster_failed")
          end
        else
          skipped_cluster_audit("openai_not_configured")
        end

      analysis = PropertyAnalyses.apply_space_audit!(analysis, audit)
      mark_cluster_steps_complete!(analysis)
    end
  end

  defp step_space_reconciliation(analysis, data) do
    analysis = PropertyAnalyses.get!(analysis.id)
    result = analysis.result || %{}
    inventory = Map.get(result, "inventory") || %{}
    space_audit = Map.get(result, "spaceAudit") || %{}
    location_context = Map.get(result, "locationContext") || %{}

    reconciled =
      cond do
        Map.get(space_audit, "skipped") == true ->
          space_audit

        Map.get(inventory, "skipped") == true ->
          skipped_reconciliation_audit("no_inventory")

        Config.configured?(:openai) ->
          case SpaceReconciler.reconcile(inventory, data, space_audit, location_context) do
            {:ok, result} -> result
            {:error, _} -> fallback_reconciliation(space_audit)
          end

        true ->
          fallback_reconciliation(space_audit)
      end

    analysis = PropertyAnalyses.apply_reconciliation!(analysis, reconciled)
    PropertyAnalyses.mark_step_complete!(analysis, "spaceReconciliation")
  end

  defp step_risk_xray(analysis, data) do
    analysis = PropertyAnalyses.get!(analysis.id)
    analysis = PropertyAnalyses.init_risk_xray!(analysis)
    location_context = Map.get(analysis.result || %{}, "locationContext") || %{}

    RiskXrayPipeline.run(analysis, data, location_context)

    analysis = PropertyAnalyses.get!(analysis.id)
    risk_data = Map.get(analysis.result || %{}, "riskXray") || %{}

    run_step(analysis, "riskXray", fn -> risk_data end)
  end

  defp mark_cluster_steps_complete!(analysis) do
    analysis
    |> PropertyAnalyses.mark_step_complete!("photoCluster")
    |> PropertyAnalyses.mark_step_complete!("spaceMapping")
  end

  defp skipped_cluster_audit(reason) do
    %{
      "spaces" => [],
      "displaySpaces" => [],
      "reconciliation" => %{
        "matchStatus" => "insufficient_photos",
        "reflections" => [],
        "missing" => [],
        "extra" => [],
        "reason" => reason
      },
      "skipped" => true,
      "reason" => reason,
      "provisional" => true
    }
  end

  defp skipped_reconciliation_audit(reason) do
    %{
      "displaySpaces" => [],
      "spaces" => [],
      "reconciliation" => %{
        "matchStatus" => "insufficient_photos",
        "reflections" => [],
        "missing" => [],
        "extra" => [],
        "reason" => reason
      },
      "spaceActions" => [],
      "provisional" => false
    }
  end

  defp fallback_reconciliation(space_audit) do
    spaces = Map.get(space_audit, "spaces") || []

    display =
      Enum.filter(spaces, fn s ->
        is_map(s) and (Map.get(s, "imageIndices") || []) != []
      end)

    %{
      "displaySpaces" => display,
      "spaces" => display,
      "reconciliation" =>
        Map.get(space_audit, "reconciliation") ||
          %{
            "matchStatus" => "partial_mismatch",
            "reflections" => ["Reconciliação automática indisponível; usando agrupamento provisório."],
            "missing" => [],
            "extra" => []
          },
      "spaceActions" => [],
      "provisional" => false
    }
  end

  defp run_step(analysis, step_key, fun) when is_function(fun, 0) do
    step_data =
      try do
        fun.()
      rescue
        e ->
          %{
            "skipped" => true,
            "reason" => "step_error",
            "error" => Exception.message(e)
          }
      end

    PropertyAnalyses.merge_step!(analysis, step_key, step_data)
  end

  defp profile_from_analysis(%{user_id: uid, org_id: oid}) do
    Profile.profile_from_headers(uid, oid)
    |> case do
      {:error, _} -> %{user_id: uid, org_id: nil}
      profile -> profile
    end
  end
end
