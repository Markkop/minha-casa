defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Riscos do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @impl true
  def key, do: "riscos"

  @impl true
  def prompt(bundle, address, _opts) do
    bundle
    |> MinhaCasaAi.PropertyAnalyses.HermesSteps.PromptTemplates.riscos(address)
    |> elem(0)
  end

  @impl true
  def normalize(raw, _bundle) do
    raw = coerce_raw(raw)

    if Map.get(raw, "skipped") == true do
      %{
        "paragrafo" => "",
        "skipped" => true,
        "reason" => Step.ensure_string(Map.get(raw, "reason"), "skipped")
      }
    else
      paragrafo =
        Step.ensure_string(Map.get(raw, "paragrafo")) ||
          Step.ensure_string(Map.get(raw, "texto")) ||
          Step.ensure_string(Map.get(raw, "text"))

      %{
        "paragrafo" => paragrafo,
        "tags" => normalize_tags(Map.get(raw, "tags"))
      }
      |> Enum.reject(fn {_k, v} -> v == [] or v == "" end)
      |> Map.new()
    end
  end

  defp coerce_raw(raw) when is_binary(raw) do
    %{"paragrafo" => String.trim(raw)}
  end

  defp coerce_raw(raw) when is_map(raw), do: raw
  defp coerce_raw(_), do: %{}

  defp normalize_tags(tags) do
    Step.ensure_list(tags)
    |> Enum.filter(&is_binary/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.uniq()
  end
end
