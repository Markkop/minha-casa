defmodule MinhaCasaAi.PropertyAnalyses.RiskXrayPipeline do
  @moduledoc """
  Runs Engenheiro Cético + Orçamentista per environment with parallel Task.async.
  """

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.PropertyAnalyses.Agents.{EngenheiroCetico, Orcamentista}
  alias MinhaCasaAi.PropertyAnalyses.{ListingAnalysis, SpaceGrouper}

  @agent_timeout 120_000

  def run(%ListingAnalysis{} = analysis, listing_data, location_context) do
    inventory = Map.get(analysis.result || %{}, "inventory") || %{}
    space_audit = Map.get(analysis.result || %{}, "spaceAudit")
    environments = SpaceGrouper.group(inventory, space_audit)

    if environments == [] do
      %{
        "environments" => [],
        "totals" => %{"costMinBrl" => 0, "costMaxBrl" => 0},
        "skipped" => true,
        "reason" => "no_inventory"
      }
    else
      max_concurrency = max_agent_concurrency()

      analysis =
        Enum.reduce(environments, analysis, fn env, acc ->
          space_id = Map.get(env, "spaceId") || Map.get(env, "scene", "indefinido")

          PropertyAnalyses.merge_space!(
            acc,
            space_id,
            Map.merge(env, %{"status" => "pending"})
          )
        end)

      stream_results =
        environments
        |> Task.async_stream(
          fn env ->
            process_environment(analysis.id, env, listing_data, location_context)
          end,
          max_concurrency: max_concurrency,
          ordered: true,
          timeout: @agent_timeout
        )
        |> Enum.to_list()

      analysis = PropertyAnalyses.finalize_risk_xray!(analysis, environments, stream_results)

      risk_xray = Map.get(analysis.result || %{}, "riskXray") || %{}

      risk_xray
      |> Map.put("totals", compute_totals(Map.get(risk_xray, "environments") || []))
    end
  end

  defp process_environment(analysis_id, env, listing_data, location_context) do
    space_id = Map.get(env, "spaceId") || Map.get(env, "scene", "indefinido")

    try do
      PropertyAnalyses.get!(analysis_id)
      |> PropertyAnalyses.merge_space!(
        space_id,
        Map.merge(env, %{
          "status" => "running",
          "agents" => %{
            "inventariante" => "done",
            "engenheiroCetico" => "running",
            "orcamentista" => "pending"
          }
        })
      )

      blind_spots =
        if Config.configured?(:openai) do
          case EngenheiroCetico.analyze(env, location_context, listing_data) do
            {:ok, spots} -> spots
            _ -> []
          end
        else
          []
        end

      env_after_engineer =
        Map.merge(env, %{
          "blindSpots" => Enum.map(blind_spots, &Map.put(&1, "estimate", nil)),
          "agents" => %{
            "inventariante" => "done",
            "engenheiroCetico" => agent_status(blind_spots),
            "orcamentista" => "running"
          }
        })

      PropertyAnalyses.get!(analysis_id)
      |> PropertyAnalyses.merge_space!(space_id, Map.put(env_after_engineer, "status", "running"))

      blind_with_estimates =
        if Config.configured?(:openai) and blind_spots != [] do
          case Orcamentista.estimate(blind_spots, listing_data, env) do
            {:ok, estimates} -> merge_estimates(blind_spots, estimates)
            _ -> blind_spots
          end
        else
          blind_spots
        end

      completed_env =
        Map.merge(env_after_engineer, %{
          "blindSpots" => blind_with_estimates,
          "status" => "completed",
          "agents" => %{
            "inventariante" => "done",
            "engenheiroCetico" => "done",
            "orcamentista" => if(blind_with_estimates == [], do: "skipped", else: "done")
          }
        })

      PropertyAnalyses.get!(analysis_id)
      |> PropertyAnalyses.merge_space!(space_id, completed_env)

      completed_env
    rescue
      e ->
        failed =
          Map.merge(env, %{
            "status" => "failed",
            "blindSpots" => [],
            "reason" => "step_error",
            "error" => Exception.message(e),
            "agents" => %{
              "inventariante" => "done",
              "engenheiroCetico" => "failed",
              "orcamentista" => "skipped"
            }
          })

        PropertyAnalyses.get!(analysis_id)
        |> PropertyAnalyses.merge_space!(space_id, failed)

        failed
    end
  end

  defp merge_estimates(blind_spots, estimates) do
    by_title =
      estimates
      |> Enum.filter(&is_map/1)
      |> Map.new(fn est -> {Map.get(est, "title"), est} end)

    Enum.map(blind_spots, fn spot ->
      title = Map.get(spot, "title")

      estimate =
        case Map.get(by_title, title) do
          %{} = est ->
            %{
              "solution" => Map.get(est, "solution"),
              "costMinBrl" => Map.get(est, "costMinBrl"),
              "costMaxBrl" => Map.get(est, "costMaxBrl"),
              "notes" => Map.get(est, "notes")
            }

          _ ->
            nil
        end

      Map.put(spot, "estimate", estimate)
    end)
  end

  defp agent_status([]), do: "skipped"
  defp agent_status(_), do: "done"

  defp compute_totals(environments) do
    {min_sum, max_sum} =
      environments
      |> Enum.flat_map(fn env -> Map.get(env, "blindSpots", []) end)
      |> Enum.reduce({0, 0}, fn spot, {acc_min, acc_max} ->
        est = Map.get(spot, "estimate") || %{}

        min_c = Map.get(est, "costMinBrl")
        max_c = Map.get(est, "costMaxBrl")

        {
          acc_min + (if is_integer(min_c), do: min_c, else: 0),
          acc_max + (if is_integer(max_c), do: max_c, else: 0)
        }
      end)

    %{"costMinBrl" => min_sum, "costMaxBrl" => max_sum}
  end

  defp max_agent_concurrency do
    Application.get_env(:minha_casa_ai, MinhaCasaAi.Config, [])
    |> Keyword.get(:property_analysis_max_agent_concurrency, 2)
  end
end
