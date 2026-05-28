defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Mercado do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @impl true
  def key, do: "mercado"

  @impl true
  def prompt(bundle, address, _opts) do
    bundle
    |> MinhaCasaAi.PropertyAnalyses.HermesSteps.PromptTemplates.mercado(address)
    |> elem(0)
  end

  @impl true
  def normalize(raw, _bundle) do
    if Map.get(raw, "skipped") == true do
      %{
        "paragrafo" => "",
        "skipped" => true,
        "reason" => Step.ensure_string(Map.get(raw, "reason"), "skipped")
      }
    else
      %{
        "paragrafo" => Step.ensure_string(Map.get(raw, "paragrafo")),
        "precoRegiaoM2" => Step.float_or_nil(Map.get(raw, "precoRegiaoM2")),
        "precoSimilaresM2" => Step.float_or_nil(Map.get(raw, "precoSimilaresM2")),
        "precoCidadeM2" => Step.float_or_nil(Map.get(raw, "precoCidadeM2")),
        "precoAnuncioM2" => Step.float_or_nil(Map.get(raw, "precoAnuncioM2"))
      }
      |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
      |> Map.new()
    end
  end

  defp facts_line(bundle) do
    case Step.facts_text(bundle) do
      nil -> ""
      text -> "Dados do anúncio: #{text}"
    end
  end
end
