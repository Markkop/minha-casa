defmodule MinhaCasaAi.Integrations.Langfuse.PromptHelpers do
  @moduledoc false

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.Langfuse.{PromptDefinitions, Prompts, Trace}

  def compile(name, vars \\ %{}) do
    case Prompts.compile(name, vars) do
      {:ok, text, ref} -> {text, ref}
      {:error, _} -> fallback(name, vars)
    end
  end

  def langfuse_ctx(feature, prompt_ref) do
    if Config.langfuse_enabled?() do
      trace =
        Trace.new_trace(feature,
          metadata: %{feature: feature},
          tags: [feature]
        )

      %{
        trace_id: trace.trace_id,
        name: feature,
        metadata: %{feature: feature},
        prompt_ref: prompt_ref
      }
    end
  end

  defp fallback(name, vars) do
    case PromptDefinitions.get(name) do
      %{"prompt" => template} ->
        text = Prompts.compile_template(template, stringify(vars))
        {text, %{name: name, version: 0}}

      _ ->
        {"", %{name: name, version: 0}}
    end
  end

  defp stringify(vars) do
    Map.new(vars, fn {k, v} -> {to_string(k), if(is_binary(v), do: v, else: to_string(v))} end)
  end
end
