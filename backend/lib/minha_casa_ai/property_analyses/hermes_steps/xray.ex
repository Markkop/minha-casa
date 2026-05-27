defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Xray do
  @moduledoc """
  Per-ambiente blind-spot analysis with repair cost estimates (replaces global orcamento).
  """

  alias MinhaCasaAi.Integrations.HermesAgent
  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @pontos_count 3

  def key, do: "xray"

  def run_for_card(bundle, address, card, context) do
    ambiente_id = Map.get(card, "id", "unknown")
    session_id = "#{Map.get(bundle, :analysis_id)}:xray:#{ambiente_id}"

    with {:ok, raw} <-
           HermesAgent.run(
             prompt_for_card(bundle, address, card, context),
             session_id: session_id
           ) do
      {:ok, normalize_pontos(raw, ambiente_id)}
    end
  end

  def prompt_for_card(bundle, address, card, context) do
    ctx = Jason.encode!(Step.location_context(bundle, address))
    clima = Jason.encode!(Map.get(context, :clima, %{}))
    riscos = Jason.encode!(Map.get(context, :riscos, %{}))
    idade = Jason.encode!(Map.get(context, :idade, %{}))
    facts = Step.facts_text(bundle) || "n/d"

    image_paths =
      card
      |> Map.get("imageIndices", [])
      |> image_paths_for_indices(bundle)

    card_json = Jason.encode!(card)

    """
    Você é o agente x-ray de um ambiente específico do imóvel. Com base nas fotos deste ambiente,
    no inventário estrutural/móveis e no contexto regional, liste EXATAMENTE #{@pontos_count} pontos
    de atenção (blind spots) com estimativa de custo de reparo/melhoria em BRL.

    Contexto regional: #{ctx}
    Clima: #{clima}
    Riscos naturais: #{riscos}
    Idade do imóvel: #{idade}
    Dados do anúncio: #{facts}

    Ambiente (card):
    #{card_json}

    Fotos deste ambiente (caminhos locais):
    #{Enum.join(image_paths, "\n")}

    Regras dos pontos:
    - Exatamente #{@pontos_count} itens — nem mais, nem menos.
    - Foque em riscos materiais/construtivos ligados ao contexto: umidade alta, salinidade, idade,
      madeira, rejuntes, vedação, infiltração, esquadrias, área molhada, exposição solar, riscos locais.
    - NÃO comente decoração, estilo, heterogeneidade visual, conforto estético, layout subjetivo.
    - Use os `material` listados no card para sugerir riscos materiais coerentes; não comente cor.
    - Cada ponto: titulo curto, descricao objetiva (o que verificar e por quê), custoMinBrl, custoMaxBrl,
      detalhes opcional (trabalho previsto).

    #{Step.pt_rules()}

    Formato JSON minificado em uma linha:
    {"pontosAtencao":[{"id":"...","titulo":"...","descricao":"...","custoMinBrl":0,"custoMaxBrl":0,"detalhes":"..."}]}
    """
  end

  @doc false
  def normalize_pontos(raw, ambiente_id) when is_map(raw) do
    raw
    |> Map.get("pontosAtencao", [])
    |> Step.ensure_list()
    |> Enum.filter(&is_map/1)
    |> Enum.map(&normalize_ponto(&1, ambiente_id))
    |> pad_to_count(@pontos_count, ambiente_id)
    |> Enum.take(@pontos_count)
    |> Enum.with_index(1)
    |> Enum.map(fn {ponto, idx} -> Map.put(ponto, "id", "#{ambiente_id}-xray-#{idx}") end)
  end

  def normalize_pontos(_, ambiente_id), do: pad_to_count([], @pontos_count, ambiente_id)

  defp normalize_ponto(p, ambiente_id) do
    min_c = Step.int_or_nil(Map.get(p, "custoMinBrl")) || 0
    max_c = Step.int_or_nil(Map.get(p, "custoMaxBrl")) || min_c
    max_c = if max_c < min_c, do: min_c, else: max_c

  idx =
      case Map.get(p, "id") do
        id when is_binary(id) and id != "" -> id
        _ -> nil
      end

    %{
      "id" => idx || "#{ambiente_id}-xray-placeholder",
      "titulo" => Step.ensure_string(Map.get(p, "titulo"), "Ponto de atenção"),
      "descricao" => Step.ensure_string(Map.get(p, "descricao")),
      "custoMinBrl" => min_c,
      "custoMaxBrl" => max_c,
      "detalhes" => Step.string_or_nil(Map.get(p, "detalhes"))
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp pad_to_count(pontos, count, ambiente_id) when length(pontos) >= count, do: pontos

  defp pad_to_count(pontos, count, ambiente_id) do
    missing = count - length(pontos)

    placeholders =
      1..missing
      |> Enum.map(fn i ->
        %{
          "id" => "#{ambiente_id}-xray-#{length(pontos) + i}",
          "titulo" => "Verificação recomendada",
          "descricao" => "Não foi possível inferir um ponto específico; inspecione este ambiente na visita.",
          "custoMinBrl" => 0,
          "custoMaxBrl" => 0
        }
      end)

    pontos ++ placeholders
  end

  defp image_paths_for_indices(indices, bundle) do
    root = Map.get(bundle, :root)
    images_dir = if root, do: Path.join(root, "images"), else: ""

    Enum.map(indices, fn idx ->
      Path.join(images_dir, "#{idx}.jpg")
    end)
  end
end
