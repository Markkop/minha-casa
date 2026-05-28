defmodule MinhaCasaAi.PropertyAnalyses.HermesPipeline do
  @moduledoc """
  Multi-step property analysis orchestrated via Hermes Agent.
  """

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.HermesAgent
  alias MinhaCasaAi.Integrations.Langfuse.Trace
  alias MinhaCasaAi.PropertyAnalyses
  alias MinhaCasaAi.PropertyAnalyses.{GeocodeStep, HermesBundle}

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.{
    Ambientes,
    Clima,
    Idade,
    Mercado,
    PromptTemplates,
    Riscos,
    Xray
  }

  @phase_1 [Clima, Riscos, Mercado, Ambientes]
  @phase_2 [Idade]

  @step_modules %{
    "clima" => Clima,
    "riscos" => Riscos,
    "mercado" => Mercado,
    "ambientes" => Ambientes,
    "idade" => Idade
  }

  def run(analysis, listing, opts \\ []) do
    bundle = HermesBundle.prepare!(analysis, listing)
    address = resolve_address(listing, analysis.input || %{})
    trace_ctx = analysis_trace(analysis, opts)

    try do
      phase_1_results = run_phase(analysis, bundle, address, @phase_1, [], trace_ctx)

      ambientes_result =
        phase_1_results
        |> Enum.find_value(fn
          {:ok, "ambientes", section} -> section
          _ -> nil
        end)

      if ambientes_result && Map.get(ambientes_result, "skipped") != true do
        bundle = HermesBundle.write_ambientes_snapshot!(bundle, ambientes_result)
        run_phase(analysis, bundle, address, @phase_2, [ambientes: ambientes_result], trace_ctx)

        analysis = PropertyAnalyses.get!(analysis.id)
        run_phase_3_xray(analysis, bundle, address, trace_ctx)
      end

      PropertyAnalyses.finalize_result!(analysis)
      analysis = PropertyAnalyses.get!(analysis.id)

      case pipeline_outcome(analysis.result) do
        :ok -> {:ok, analysis.result}
        {:error, reason} -> {:error, reason}
      end
    after
      HermesBundle.cleanup(bundle)
    end
  end

  @doc """
  Re-runs a single pipeline step for an existing analysis (used by per-card refresh).
  """
  def run_single_step(analysis, listing, step_key, opts \\ []) when is_binary(step_key) do
    if step_key == "xray" do
      {:error, :use_per_card_xray}
    else
      with {:ok, step_module} <- step_module(step_key) do
        bundle = HermesBundle.prepare!(analysis, listing)
        address = resolve_address(listing, analysis.input || %{})
        trace_ctx = analysis_trace(analysis, opts)

        try do
          step_opts = single_step_opts(analysis, step_key)
          bundle = maybe_write_ambientes_snapshot!(bundle, analysis, step_key)

          PropertyAnalyses.mark_step_running!(analysis.id, step_key)

          result =
            run_step(analysis, bundle, address, step_module, step_opts, trace_ctx,
              track_running: false
            )

          case result do
            {:ok, ^step_key, section} ->
              if step_key == "ambientes" do
                PropertyAnalyses.reset_ambiente_xrays!(analysis.id)
              end

              {:ok, section}

            {:error, ^step_key, reason} ->
              {:error, reason}

            other ->
              {:error, other}
          end
        after
          PropertyAnalyses.clear_step_running!(analysis.id, step_key)
          HermesBundle.cleanup(bundle)
        end
      end
    end
  end

  @doc """
  Re-runs x-ray (blind spots + orçamento) for one ambiente card.
  """
  def run_card_xray(analysis, listing, ambiente_id, opts \\ []) when is_binary(ambiente_id) do
    analysis = PropertyAnalyses.get!(analysis.id)
    card = PropertyAnalyses.get_ambiente_card(analysis, ambiente_id)

    if is_nil(card) do
      {:error, :ambiente_not_found}
    else
      bundle = HermesBundle.prepare!(analysis, listing)
      address = resolve_address(listing, analysis.input || %{})

      try do
        bundle = maybe_write_ambientes_snapshot!(bundle, analysis, "idade")
        PropertyAnalyses.mark_ambiente_xray_running!(analysis.id, ambiente_id)

        context = xray_context(analysis)
        trace_ctx = analysis_trace(analysis, opts)
        {prompt_text, prompt_ref} = PromptTemplates.xray_card(bundle, address, card, context)

        lf_opts = [
          langfuse: hermes_langfuse_ctx(trace_ctx, "xray:#{ambiente_id}", prompt_ref)
        ]

        case Xray.run_for_card(bundle, address, card, context, prompt_text, lf_opts) do
          {:ok, pontos} ->
            PropertyAnalyses.patch_ambiente_xray!(analysis.id, ambiente_id, pontos)
            {:ok, pontos}

          {:error, reason} ->
            PropertyAnalyses.mark_ambiente_xray_failed!(analysis.id, ambiente_id, reason)
            {:error, reason}
        end
      rescue
        e ->
          PropertyAnalyses.mark_ambiente_xray_failed!(
            analysis.id,
            ambiente_id,
            Exception.message(e)
          )

          {:error, Exception.message(e)}
      after
        HermesBundle.cleanup(bundle)
      end
    end
  end

  defp single_step_opts(analysis, "idade") do
    ambientes = Map.get(analysis.result || %{}, "ambientes", %{})
    [ambientes: ambientes]
  end

  defp single_step_opts(_analysis, _step), do: []

  defp maybe_write_ambientes_snapshot!(bundle, analysis, step_key)
       when step_key in ["idade", "xray"] do
    ambientes = Map.get(analysis.result || %{}, "ambientes")

    if is_map(ambientes) and map_size(ambientes) > 0 do
      HermesBundle.write_ambientes_snapshot!(bundle, ambientes)
    else
      bundle
    end
  end

  defp maybe_write_ambientes_snapshot!(bundle, _analysis, _step), do: bundle

  defp step_module(step_key) do
    case Map.get(@step_modules, step_key) do
      nil -> {:error, :invalid_step}
      mod -> {:ok, mod}
    end
  end

  defp run_phase(analysis, bundle, address, steps, opts, trace_ctx) do
    timeout = Config.hermes_analysis_timeout_ms()

    steps
    |> Task.async_stream(
      fn step_module ->
        run_step(analysis, bundle, address, step_module, opts, trace_ctx)
      end,
      max_concurrency: length(steps),
      ordered: false,
      timeout: timeout + 5_000
    )
    |> Enum.map(fn
      {:ok, result} -> result
      {:exit, reason} -> {:error, :task_exit, reason}
    end)
  end

  defp run_phase_3_xray(analysis, bundle, address, trace_ctx) do
    analysis = PropertyAnalyses.get!(analysis.id)
    cards = get_in(analysis.result || %{}, ["ambientes", "cards"]) || []
    context = xray_context(analysis)
    timeout = Config.hermes_analysis_timeout_ms()

    cards
    |> Task.async_stream(
      fn card ->
        ambiente_id = Map.get(card, "id")

        try do
          PropertyAnalyses.mark_ambiente_xray_running!(analysis.id, ambiente_id)

          {prompt_text, prompt_ref} = PromptTemplates.xray_card(bundle, address, card, context)

          lf_opts = [
            langfuse: hermes_langfuse_ctx(trace_ctx, "xray:#{ambiente_id}", prompt_ref)
          ]

          case Xray.run_for_card(bundle, address, card, context, prompt_text, lf_opts) do
            {:ok, pontos} ->
              PropertyAnalyses.patch_ambiente_xray!(analysis.id, ambiente_id, pontos)
              {:ok, ambiente_id}

            {:error, reason} ->
              PropertyAnalyses.mark_ambiente_xray_failed!(analysis.id, ambiente_id, reason)
              {:error, ambiente_id, reason}
          end
        rescue
          e ->
            PropertyAnalyses.mark_ambiente_xray_failed!(
              analysis.id,
              ambiente_id,
              Exception.message(e)
            )

            {:error, ambiente_id, Exception.message(e)}
        end
      end,
      max_concurrency: 4,
      ordered: false,
      timeout: timeout + 5_000
    )
    |> Stream.run()
  end

  defp xray_context(analysis) do
    result = analysis.result || %{}

    %{
      clima: Map.get(result, "clima", %{}),
      riscos: Map.get(result, "riscos", %{}),
      idade: Map.get(result, "idade", %{})
    }
  end

  defp run_step(analysis, bundle, address, step_module, opts, trace_ctx, run_opts \\ []) do
    key = step_module.key()
    session_id = "#{analysis.id}:#{key}"
    track_running? = Keyword.get(run_opts, :track_running, true)

    if track_running?, do: PropertyAnalyses.mark_step_running!(analysis.id, key)

    try do
      hermes_opts = hermes_opts_for_step(key)
      {prompt_text, prompt_ref} = PromptTemplates.for_step(step_module, bundle, address, opts)

      hermes_opts =
        Keyword.merge(hermes_opts, [
          session_id: session_id,
          langfuse: hermes_langfuse_ctx(trace_ctx, key, prompt_ref)
        ])

      with {:ok, raw} <- HermesAgent.run(prompt_text, hermes_opts),
           section <- step_module.normalize(raw, bundle) do
        PropertyAnalyses.patch_result!(analysis.id, key, section)
        {:ok, key, section}
      else
        {:error, reason} ->
          PropertyAnalyses.mark_step_failed!(analysis.id, key, reason)
          {:error, key, reason}
      end
    rescue
      e ->
        PropertyAnalyses.mark_step_failed!(analysis.id, key, Exception.message(e))
        {:error, key, Exception.message(e)}
    after
      if track_running?, do: PropertyAnalyses.clear_step_running!(analysis.id, key)
    end
  end

  defp hermes_opts_for_step("riscos") do
    [timeout_ms: Config.hermes_analysis_timeout_ms() + 60_000]
  end

  defp hermes_opts_for_step(_), do: []

  defp analysis_trace(analysis, opts) do
    metadata = %{
      analysis_id: analysis.id,
      org_id: analysis.org_id,
      listing_id: analysis.listing_id || get_in(analysis.input || %{}, ["listingId"])
    }

    case Keyword.get(opts, :trace_id) do
      trace_id when is_binary(trace_id) ->
        Trace.resume_trace(trace_id,
          name: "property_analysis",
          metadata: metadata,
          user_id: analysis.user_id,
          session_id: analysis.id
        )

      _ ->
        Trace.new_trace("property_analysis",
          metadata: metadata,
          user_id: analysis.user_id,
          session_id: analysis.id,
          tags: ["hermes", "property_analysis"]
        )
    end
  end

  defp hermes_langfuse_ctx(trace_ctx, step_name, prompt_ref) do
    %{
      trace_id: trace_ctx[:trace_id],
      parent_observation_id: trace_ctx[:observation_id],
      name: "hermes:#{step_name}",
      metadata: Map.merge(trace_ctx[:metadata] || %{}, %{step: step_name}),
      prompt_ref: prompt_ref
    }
  end

  defp pipeline_outcome(result) when is_map(result) do
    completed = Map.get(result, "completedSteps", [])
    failed = Map.get(result, "failedSteps", [])

    cond do
      "ambientes" in completed ->
        :ok

      failed != [] and completed == [] ->
        {:error, {:all_steps_failed, summarize_failures(failed)}}

      true ->
        :ok
    end
  end

  defp pipeline_outcome(_), do: {:error, :empty_result}

  defp summarize_failures(failed) do
    keys = Enum.join(failed, ", ")

    if Config.configured?(:openai) do
      "Nenhuma etapa concluída (#{keys}). Verifique os logs do Hermes."
    else
      "Nenhuma etapa concluída (#{keys}). Configure OPENAI_API_KEY para o container hermes-agent."
    end
  end

  defp resolve_address(listing, input) do
    data = listing.data || %{}

    case GeocodeStep.run(data, input) do
      {:ok, geocode} when is_map(geocode) ->
        %{
          "lat" => Map.get(geocode, "lat"),
          "lng" => Map.get(geocode, "lng"),
          "formattedAddress" => Map.get(geocode, "formattedAddress"),
          "cidade" => data["cidade"] || data["city"],
          "bairro" => data["bairro"] || data["neighborhood"]
        }
        |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
        |> Map.new()

      _ ->
        %{
          "cidade" => data["cidade"] || data["city"],
          "bairro" => data["bairro"] || data["neighborhood"]
        }
        |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
        |> Map.new()
    end
  end
end
