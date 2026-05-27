defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Idade do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @impl true
  def key, do: "idade"

  @impl true
  def prompt(bundle, address, opts) do
    ambientes = Keyword.get(opts, :ambientes, %{})
    ambientes_path = Map.get(bundle, :ambientes_path)
    ctx = Jason.encode!(Step.location_context(bundle, address))

    ambientes_json =
      if is_binary(ambientes_path) and File.exists?(ambientes_path) do
        File.read!(ambientes_path)
      else
        Jason.encode!(ambientes)
      end

    facts = Step.facts_text(bundle) || "n/d"

    """
    Estime a idade do imóvel com base nas fotos dos ambientes e nos metadados do anúncio.

    Contexto: #{ctx}
    Dados do anúncio: #{facts}
    Ambientes analisados: #{ambientes_json}

    #{Step.pt_rules()}

    Formato:
    {
      "estimativaAnos": number,
      "faixaAnos": { "min": number, "max": number },
      "resumo": "parágrafo curto",
      "sinaisVistos": ["sinal 1", "sinal 2"]
    }
    """
  end

  @impl true
  def normalize(raw, _bundle) do
    if Map.get(raw, "skipped") == true do
      %{
        "resumo" => "",
        "sinaisVistos" => [],
        "skipped" => true,
        "reason" => Step.ensure_string(Map.get(raw, "reason"), "skipped")
      }
    else
      faixa =
        case Map.get(raw, "faixaAnos") do
          %{"min" => min, "max" => max} when is_number(min) and is_number(max) ->
            %{"min" => trunc(min), "max" => trunc(max)}

          _ ->
            nil
        end

      %{
        "estimativaAnos" => Step.int_or_nil(Map.get(raw, "estimativaAnos")),
        "faixaAnos" => faixa,
        "resumo" => Step.ensure_string(Map.get(raw, "resumo")),
        "sinaisVistos" => normalize_sinais(Map.get(raw, "sinaisVistos"))
      }
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)
      |> Map.new()
    end
  end

  defp normalize_sinais(list) do
    Step.ensure_list(list)
    |> Enum.filter(&is_binary/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end
end
