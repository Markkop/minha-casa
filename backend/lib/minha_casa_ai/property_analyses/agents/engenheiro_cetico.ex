defmodule MinhaCasaAi.PropertyAnalyses.Agents.EngenheiroCetico do
  @moduledoc """
  Stage 2 — skeptical structural risks from inventory + local context.
  """

  alias MinhaCasaAi.Integrations.PropertyLlm

  @system_prompt """
  Você é o Engenheiro Cético: inspetor preditivo para um comprador no Brasil.
  Ignore a estética perfeita das fotos de venda (staging, filtros, ângulos).

  Com base no inventário factual do ambiente e no contexto local (clima, bairro, tipologia),
  liste os 2 a 4 maiores RISCOS ESTRUTURAIS ou de MANUTENÇÃO OCULTOS que fotos maquiadas
  costumam esconder para essa combinação de materiais neste local.

  Cada item deve ser um "ponto cego" investigativo — ainda não confirmado na visita.

  Responda APENAS JSON em português:
  {
    "blindSpots": [
      {
        "title": "título curto do ponto cego",
        "whyCheck": "por que o comprador deve checar (2-4 frases, técnicas)",
        "visitQuestion": "pergunta objetiva para fazer ao vendedor/corretor na visita"
      }
    ]
  }
  """

  def analyze(environment, location_context, listing_data) do
    payload =
      Jason.encode!(%{
        "environment" => environment,
        "locationContext" => location_context,
        "listing" => listing_summary(listing_data)
      })

    case PropertyLlm.chat_json(@system_prompt, payload, temperature: 0.35, max_tokens: 2_200) do
      {:ok, %{"blindSpots" => spots}} when is_list(spots) ->
        {:ok, normalize_blind_spots(spots)}

      {:ok, _} ->
        {:ok, []}

      error ->
        error
    end
  end

  defp listing_summary(data) when is_map(data) do
    %{
      "tipoImovel" => Map.get(data, "tipoImovel"),
      "m2Privado" => Map.get(data, "m2Privado") || Map.get(data, "m2Totais"),
      "idade" => Map.get(data, "idade") || Map.get(data, "anoConstrucao"),
      "bairro" => Map.get(data, "bairro"),
      "cidade" => Map.get(data, "cidade")
    }
  end

  defp listing_summary(_), do: %{}

  defp normalize_blind_spots(spots) do
    spots
    |> Enum.filter(&is_map/1)
    |> Enum.map(fn spot ->
      %{
        "title" => string_field(spot, "title"),
        "whyCheck" => string_field(spot, "whyCheck"),
        "visitQuestion" => string_field(spot, "visitQuestion")
      }
    end)
    |> Enum.filter(&(Map.get(&1, "title") != ""))
    |> Enum.take(4)
  end

  defp string_field(map, key) do
    case Map.get(map, key) do
      v when is_binary(v) -> String.trim(v)
      _ -> ""
    end
  end
end
