defmodule MinhaCasaAi.Integrations.Langfuse.OpenAI do
  @moduledoc false

  alias MinhaCasaAi.Integrations.Langfuse.{Cost, Trace}

  def wrap(lf_ctx, model, instructions, input, fun) when is_function(fun, 0) do
    if lf_ctx do
      started_at = DateTime.utc_now()

      case fun.() do
        {:ok, result, resp} ->
          emit_generation(lf_ctx, model, instructions, input, result, resp, started_at)
          {:ok, result}

        {:ok, result} ->
          emit_generation(lf_ctx, model, instructions, input, result, %{}, started_at)
          {:ok, result}

        other ->
          emit_error(lf_ctx, model, instructions, input, other, started_at)
          other
      end
    else
      case fun.() do
        {:ok, result, _resp} -> {:ok, result}
        other -> other
      end
    end
  end

  defp emit_generation(lf_ctx, model, instructions, input, result, resp, started_at) do
    usage = Cost.usage_from_openai_response(resp)
    ended_at = DateTime.utc_now()

    Trace.generation(
      lf_ctx,
      %{
        name: Map.get(lf_ctx, :name, "openai"),
        model: model,
        input: format_input(instructions, input),
        output: format_output(result),
        usage: usage,
        metadata: %{
          latency_ms: DateTime.diff(ended_at, started_at, :millisecond),
          estimated_cost_usd: Cost.estimated_cost_usd(model, usage)
        },
        start_time: iso(started_at),
        end_time: iso(ended_at)
      }
    )
  end

  defp emit_error(lf_ctx, model, instructions, input, error, started_at) do
    ended_at = DateTime.utc_now()

    Trace.generation(
      Map.put(lf_ctx, :metadata, Map.merge(lf_ctx[:metadata] || %{}, %{error: inspect(error)})),
      %{
        name: Map.get(lf_ctx, :name, "openai"),
        model: model,
        input: format_input(instructions, input),
        output: inspect(error),
        level: "ERROR",
        status_message: inspect(error),
        start_time: iso(started_at),
        end_time: iso(ended_at)
      }
    )
  end

  defp format_input(instructions, input) when is_binary(input) do
    %{instructions: instructions, input: input}
  end

  defp format_input(instructions, input) do
    %{instructions: instructions, input: input}
  end

  defp format_output(%{} = map), do: Jason.encode!(map)
  defp format_output(text) when is_binary(text), do: text
  defp format_output(other), do: inspect(other, limit: 4000)

  defp iso(%DateTime{} = dt) do
    dt |> DateTime.truncate(:millisecond) |> DateTime.to_iso8601()
  end
end
