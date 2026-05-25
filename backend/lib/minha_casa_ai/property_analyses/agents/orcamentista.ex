defmodule MinhaCasaAi.PropertyAnalyses.Agents.Orcamentista do
  @moduledoc """
  Stage 3 — parametric repair cost ranges (BRL) if risks are confirmed on visit.
  """

  alias MinhaCasaAi.Integrations.PropertyLlm

  @system_prompt """
  Você é o Orçamentista: assistente financeiro de compra no Brasil.
  Para cada ponto cego (risco ainda não confirmado), estime o custo de mercado SE o problema
  existir após a visita.

  Use faixas realistas em reais (BRL), considerando a metragem do imóvel como escala.
  Não invente valores exatos — use mínimo e máximo. Inclua breve nota quando o custo depende
  de metragem do ambiente ou extensão do dano.

  Responda APENAS JSON em português:
  {
    "estimates": [
      {
        "title": "mesmo título do ponto cego",
        "solution": "o que normalmente precisa ser feito",
        "costMinBrl": 3500,
        "costMaxBrl": 7000,
        "notes": "opcional"
      }
    ]
  }
  """

  def estimate(blind_spots, listing_data, environment) when is_list(blind_spots) do
    if blind_spots == [] do
      {:ok, []}
    else
      payload =
        Jason.encode!(%{
          "blindSpots" => blind_spots,
          "environment" => Map.take(environment, ["scene", "label", "imageIndices"]),
          "listingM2" => listing_m2(listing_data)
        })

      case PropertyLlm.chat_json(@system_prompt, payload, temperature: 0.3, max_tokens: 2_000) do
        {:ok, %{"estimates" => estimates}} when is_list(estimates) ->
          {:ok, normalize_estimates(estimates)}

        {:ok, _} ->
          {:ok, []}

        error ->
          error
      end
    end
  end

  defp listing_m2(data) when is_map(data) do
    Map.get(data, "m2Privado") || Map.get(data, "m2Totais")
  end

  defp listing_m2(_), do: nil

  defp normalize_estimates(estimates) do
    estimates
    |> Enum.filter(&is_map/1)
    |> Enum.map(fn est ->
      %{
        "title" => string_field(est, "title"),
        "solution" => string_field(est, "solution"),
        "costMinBrl" => coerce_money(Map.get(est, "costMinBrl")),
        "costMaxBrl" => coerce_money(Map.get(est, "costMaxBrl")),
        "notes" => nullable_string(Map.get(est, "notes"))
      }
    end)
    |> Enum.filter(&(Map.get(&1, "title") != ""))
  end

  defp coerce_money(n) when is_integer(n) and n >= 0, do: n
  defp coerce_money(n) when is_float(n) and n >= 0, do: round(n)

  defp coerce_money(s) when is_binary(s) do
    case Integer.parse(String.replace(s, ~r/[^\d]/, "")) do
      {n, _} when n >= 0 -> n
      _ -> nil
    end
  end

  defp coerce_money(_), do: nil

  defp string_field(map, key) do
    case Map.get(map, key) do
      v when is_binary(v) -> String.trim(v)
      _ -> ""
    end
  end

  defp nullable_string(v) when is_binary(v), do: String.trim(v)
  defp nullable_string(_), do: nil
end
