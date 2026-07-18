defmodule MinhaCasaAi.Integrations.Langfuse.Cost do
  @moduledoc false

  # USD per 1M tokens (approximate; used when provider omits cost).
  @prices %{
    "gpt-5.4-mini" => %{input: 0.15, output: 0.60},
    "gpt-4o" => %{input: 2.50, output: 10.00},
    "gpt-4o-mini" => %{input: 0.15, output: 0.60}
  }

  def usage_from_openai_response(resp) when is_map(resp) do
    usage = resp["usage"] || %{}

    input = int(usage["input_tokens"] || usage["prompt_tokens"])
    output = int(usage["output_tokens"] || usage["completion_tokens"])
    total = int(usage["total_tokens"]) || input + output

    %{
      input: input,
      output: output,
      total: total,
      unit: "TOKENS"
    }
  end

  def usage_from_openai_response(_), do: nil

  def estimated_cost_usd(model, usage) when is_map(usage) do
    case Map.get(@prices, normalize_model(model)) do
      %{input: in_price, output: out_price} ->
        input = Map.get(usage, :input) || 0
        output = Map.get(usage, :output) || 0
        input * in_price / 1_000_000 + output * out_price / 1_000_000

      _ ->
        nil
    end
  end

  def estimated_cost_usd(_, _), do: nil

  defp normalize_model(model) when is_binary(model) do
    model
    |> String.split(":")
    |> List.first()
    |> String.trim()
  end

  defp normalize_model(_), do: "unknown"

  defp int(n) when is_integer(n), do: n
  defp int(n) when is_float(n), do: trunc(n)
  defp int(_), do: 0
end
