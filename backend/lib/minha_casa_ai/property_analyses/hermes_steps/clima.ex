defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Clima do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @impl true
  def key, do: "clima"

  @impl true
  def prompt(bundle, address, _opts) do
    bundle
    |> MinhaCasaAi.PropertyAnalyses.HermesSteps.PromptTemplates.clima(address)
    |> elem(0)
  end

  @impl true
  def normalize(raw, _bundle) do
    if Map.get(raw, "skipped") == true do
      %{
        "resumo" => "",
        "temperaturas" => %{"descricao" => ""},
        "umidade" => %{"descricao" => ""},
        "chuva" => %{"descricao" => ""},
        "skipped" => true,
        "reason" => Step.ensure_string(Map.get(raw, "reason"), "skipped")
      }
    else
      %{
        "resumo" => Step.ensure_string(Map.get(raw, "resumo")),
        "temperaturas" => normalize_range(Map.get(raw, "temperaturas"), "minC", "maxC"),
        "umidade" => normalize_range(Map.get(raw, "umidade"), "minPct", "maxPct"),
        "chuva" => normalize_chuva(Map.get(raw, "chuva"))
      }
    end
  end

  defp normalize_range(raw, min_key, max_key) do
    m = Step.ensure_map(raw)

    base = %{
      min_key => Step.float_or_nil(Map.get(m, min_key)),
      max_key => Step.float_or_nil(Map.get(m, max_key)),
      "descricao" => Step.ensure_string(Map.get(m, "descricao"))
    }

    base
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
    |> Map.put_new("descricao", "")
  end

  defp normalize_chuva(raw) do
    m = Step.ensure_map(raw)

    base = %{
      "descricao" => Step.ensure_string(Map.get(m, "descricao")),
      "mmAnualEstimado" => Step.float_or_nil(Map.get(m, "mmAnualEstimado"))
    }

    base
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
    |> Map.put_new("descricao", "")
  end
end
