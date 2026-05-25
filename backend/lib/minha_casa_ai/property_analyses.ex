defmodule MinhaCasaAi.PropertyAnalyses do
  import Ecto.Query

  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.PropertyAnalyses.ListingAnalysis
  alias MinhaCasaAi.PropertyAnalyses.SpaceSlug
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workers.PropertyAnalysisWorker
  alias MinhaCasaAi.Workflows
  alias MinhaCasaAi.Workflows.WorkflowRun
  alias MinhaCasaAi.Workspace.Profile

  @active_statuses ["queued", "running"]
  @schema_version 3

  def create(listing_id, opts) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)
    input = Keyword.get(opts, :input, %{})

    force? = force_new_run?(input)

    with {:ok, listing} <- Listings.get_listing_by_id(listing_id, user_id: user_id, org_id: org_id),
         {:ok, profile} <- profile_tuple(user_id, org_id),
         {:ok, decision} <-
           if(force?, do: {:ok, :proceed}, else: ensure_not_running(listing_id, profile)) do
      case decision do
        %ListingAnalysis{} = active ->
          {:ok, active}

        :proceed ->
          do_start_new_analysis(listing, input, user_id, org_id)
      end
    end
  end

  defp force_new_run?(input) when is_map(input) do
    case Map.get(input, "force") do
      true -> true
      "true" -> true
      _ -> false
    end
  end

  defp force_new_run?(_), do: false

  defp ensure_not_running(listing_id, profile) do
    case find_active(listing_id, profile) do
      nil -> {:ok, :proceed}
      %ListingAnalysis{} = active -> {:ok, active}
    end
  end

  defp do_start_new_analysis(listing, input, user_id, org_id) do
    Repo.transaction(fn ->
      workflow_input =
        Map.merge(input, %{
          "listingId" => listing.id,
          "collectionId" => listing.collection_id
        })

      run =
        %WorkflowRun{}
        |> WorkflowRun.changeset(%{
          kind: "property_deep_analysis",
          status: "received",
          input: workflow_input,
          user_id: user_id,
          org_id: org_id
        })
        |> Repo.insert!()

      analysis =
        %ListingAnalysis{}
        |> ListingAnalysis.changeset(%{
          listing_id: listing.id,
          workflow_run_id: run.id,
          user_id: user_id,
          org_id: org_id,
          status: "queued",
          input: workflow_input,
          result: initial_result()
        })
        |> Repo.insert!()

      %{analysis_id: analysis.id}
      |> PropertyAnalysisWorker.new()
      |> Oban.insert!()

      analysis
    end)
  end

  def get!(id), do: Repo.get!(ListingAnalysis, id)

  def get(id), do: Repo.get(ListingAnalysis, id)

  def get_for_profile(id, profile) do
    case get(id) do
      nil ->
        {:error, :not_found}

      %ListingAnalysis{} = analysis ->
        if analysis_owned_by?(analysis, profile),
          do: {:ok, analysis},
          else: {:error, :not_found}
    end
  end

  def latest_for_listing(listing_id, profile) do
    ListingAnalysis
    |> where([a], a.listing_id == ^listing_id)
    |> scope_analysis(profile)
    |> order_by([a], desc: a.created_at)
    |> limit(1)
    |> Repo.one()
    |> case do
      nil -> {:ok, nil}
      analysis -> {:ok, analysis}
    end
  end

  def mark_running!(%ListingAnalysis{} = analysis) do
    update_analysis!(analysis, %{status: "running"})
  end

  def mark_completed!(%ListingAnalysis{} = analysis) do
    update_analysis!(analysis, %{status: "completed", error: nil})
  end

  def mark_failed!(%ListingAnalysis{} = analysis, message) do
    update_analysis!(analysis, %{status: "failed", error: to_string(message)})
  end

  def merge_step!(%ListingAnalysis{} = analysis, step_key, step_data) when is_binary(step_key) do
    result = analysis.result || initial_result()
    completed = result["completedSteps"] || []

    completed =
      if step_key in completed, do: completed, else: completed ++ [step_key]

    merged =
      result
      |> Map.put(step_key, step_data)
      |> Map.put("completedSteps", completed)
      |> Map.put("schemaVersion", current_schema_version(result))

    analysis = update_analysis!(analysis, %{result: merged})
    sync_workflow_result!(analysis)
    analysis
  end

  def merge_environment!(%ListingAnalysis{} = analysis, env_key, env_attrs)
      when is_binary(env_key) and is_map(env_attrs) do
    merge_space!(analysis, env_key, env_attrs)
  end

  def merge_space!(%ListingAnalysis{} = analysis, space_id, env_attrs)
      when is_binary(space_id) and is_map(env_attrs) do
    space_id = SpaceSlug.slug(space_id)

    {:ok, updated} =
      Repo.transaction(fn ->
        locked =
          from(a in ListingAnalysis, where: a.id == ^analysis.id, lock: "FOR UPDATE")
          |> Repo.one!()

        result = locked.result || initial_result()
        risk_xray = Map.get(result, "riskXray") || %{"environments" => [], "totals" => default_totals()}
        environments = Map.get(risk_xray, "environments") || []

        env_attrs =
          env_attrs
          |> Map.put("spaceId", space_id)
          |> Map.put_new("scene", Map.get(env_attrs, "scene") || space_id)

        environments =
          case find_environment_index(environments, space_id) do
            nil -> environments ++ [env_attrs]
            idx -> List.replace_at(environments, idx, env_attrs)
          end

        totals = compute_risk_totals(environments)

        risk_xray =
          risk_xray
          |> Map.put("environments", environments)
          |> Map.put("totals", totals)

        merged =
          result
          |> Map.put("riskXray", risk_xray)
          |> Map.put("schemaVersion", current_schema_version(result))

        locked
        |> update_analysis!(%{result: merged})
      end)

    sync_workflow_result!(updated)
    updated
  end

  def apply_space_audit!(%ListingAnalysis{} = analysis, space_audit) when is_map(space_audit) do
    result = analysis.result || initial_result()
    inventory = Map.get(result, "inventory") || %{}
    images = Map.get(inventory, "images") || []

    spaces =
      Map.get(space_audit, "displaySpaces") ||
        Map.get(space_audit, "spaces") ||
        []

    index_to_space = build_index_to_space(spaces)

    images =
      Enum.map(images, fn img ->
        idx = Map.get(img, "index")

        case Map.get(index_to_space, idx) do
          nil -> img
          space_id -> Map.put(img, "spaceId", space_id)
        end
      end)

    merged =
      result
      |> Map.put("inventory", Map.put(inventory, "images", images))
      |> Map.put("spaceAudit", space_audit)
      |> Map.put("schemaVersion", current_schema_version(result))

    analysis = update_analysis!(analysis, %{result: merged})
    sync_workflow_result!(analysis)
    analysis
  end

  def mark_step_complete!(%ListingAnalysis{} = analysis, step_key) when is_binary(step_key) do
    result = analysis.result || initial_result()
    completed = result["completedSteps"] || []

    completed =
      if step_key in completed, do: completed, else: completed ++ [step_key]

    merged =
      result
      |> Map.put("completedSteps", completed)
      |> Map.put("schemaVersion", result_schema_version(result))

    analysis = update_analysis!(analysis, %{result: merged})
    sync_workflow_result!(analysis)
    analysis
  end

  defp find_environment_index(environments, space_id) do
    slug = SpaceSlug.slug(space_id)

    Enum.find_index(environments, fn env ->
      SpaceSlug.slug(Map.get(env, "spaceId") || "") == slug
    end)
  end

  @doc """
  Ensures every expected environment has a terminal row in riskXray after the parallel pipeline.
  """
  def finalize_risk_xray!(%ListingAnalysis{} = analysis, expected_envs, stream_results)
      when is_list(expected_envs) and is_list(stream_results) do
    merged_results =
      Enum.zip(expected_envs, stream_results)
      |> Enum.map(fn {orig, stream_result} ->
        case stream_result do
          {:ok, %{} = env} ->
            env

          _ ->
            Map.merge(orig, %{
              "status" => "failed",
              "blindSpots" => [],
              "reason" => "agent_timeout_or_error",
              "agents" => %{
                "inventariante" => "done",
                "engenheiroCetico" => "failed",
                "orcamentista" => "skipped"
              }
            })
        end
      end)

    Enum.reduce(merged_results, analysis, fn env, acc ->
      space_id = Map.get(env, "spaceId") || Map.get(env, "scene", "indefinido")
      merge_space!(acc, space_id, env)
    end)
  end

  defp build_index_to_space(spaces) do
    spaces
    |> Enum.flat_map(fn space ->
      space_id = Map.get(space, "spaceId")

      (Map.get(space, "imageIndices") || [])
      |> Enum.filter(&is_integer/1)
      |> Enum.map(&{&1, space_id})
    end)
    |> Enum.reject(fn {_idx, sid} -> is_nil(sid) end)
    |> Map.new()
  end

  def init_risk_xray!(%ListingAnalysis{} = analysis) do
    result = analysis.result || initial_result()

    risk_xray =
      case Map.get(result, "riskXray") do
        %{} = rx -> rx
        _ -> %{"environments" => [], "totals" => default_totals()}
      end

    merged =
      result
      |> Map.put("riskXray", risk_xray)
      |> Map.put("schemaVersion", current_schema_version(result))

    update_analysis!(analysis, %{result: merged})
  end

  defp current_schema_version(result) do
    case Map.get(result, "schemaVersion") do
      v when is_integer(v) and v >= @schema_version -> v
      v when is_integer(v) and v >= 2 -> v
      _ -> @schema_version
    end
  end

  def sync_workflow_result!(%ListingAnalysis{} = analysis) do
    if analysis.workflow_run_id do
      case Workflows.get_run(analysis.workflow_run_id) do
        %WorkflowRun{} = run ->
          Workflows.update_result!(run, analysis.result)

        _ ->
          :ok
      end
    end
  end

  defp find_active(listing_id, profile) do
    ListingAnalysis
    |> where([a], a.listing_id == ^listing_id and a.status in ^@active_statuses)
    |> scope_analysis(profile)
    |> order_by([a], desc: a.created_at)
    |> limit(1)
    |> Repo.one()
  end

  defp scope_analysis(query, %{user_id: uid, org_id: nil}) when is_binary(uid) do
    where(query, [a], a.user_id == ^uid and is_nil(a.org_id))
  end

  defp scope_analysis(query, %{user_id: nil, org_id: oid}) when is_binary(oid) do
    where(query, [a], a.org_id == ^oid)
  end

  defp scope_analysis(query, _), do: where(query, [a], false)

  defp analysis_owned_by?(%ListingAnalysis{user_id: uid, org_id: nil}, %{user_id: puid, org_id: nil}) do
    uid == puid
  end

  defp analysis_owned_by?(%ListingAnalysis{org_id: oid}, %{org_id: poid}) when is_binary(oid) do
    oid == poid
  end

  defp analysis_owned_by?(_, _), do: false

  defp profile_tuple(user_id, org_id) do
    case Profile.profile_from_headers(user_id, org_id) do
      {:error, _} = err -> err
      profile -> {:ok, profile}
    end
  end

  defp update_analysis!(analysis, attrs) do
    analysis
    |> ListingAnalysis.changeset(attrs)
    |> Repo.update!()
  end

  def apply_reconciliation!(%ListingAnalysis{} = analysis, reconciled) when is_map(reconciled) do
    display_spaces =
      (Map.get(reconciled, "displaySpaces") || Map.get(reconciled, "spaces") || [])
      |> Enum.filter(fn s -> is_map(s) and Map.get(s, "visible") != false end)
      |> Enum.reject(fn s -> (Map.get(s, "imageIndices") || []) == [] end)

    audit =
      Map.merge(reconciled, %{
        "spaces" => display_spaces,
        "displaySpaces" => display_spaces,
        "provisional" => false
      })

    apply_space_audit!(analysis, audit)
  end

  defp initial_result do
    %{"schemaVersion" => @schema_version, "completedSteps" => []}
  end

  defp result_schema_version(%{"schemaVersion" => v}) when is_integer(v) and v >= @schema_version,
    do: v

  defp result_schema_version(%{"schemaVersion" => v}) when is_integer(v) and v >= 2, do: v
  defp result_schema_version(_), do: @schema_version

  defp default_totals, do: %{"costMinBrl" => 0, "costMaxBrl" => 0}

  defp compute_risk_totals(environments) do
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
end
