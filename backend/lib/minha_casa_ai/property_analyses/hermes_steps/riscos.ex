defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Riscos do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @impl true
  def key, do: "riscos"

  @impl true
  def prompt(bundle, address, _opts) do
    ctx = Jason.encode!(Step.location_context(bundle, address))

    """
    Pesquise riscos naturais relevantes para a região do imóvel (enchentes, deslizamentos, ventos fortes, etc.).
    Use no máximo uma busca rápida na web; não use extração de URL nem ferramentas de terminal/código/navegador.
    Responda em um único objeto JSON minificado em uma linha, sem Markdown.

    Contexto: #{ctx}
    #{facts_line(bundle)}

    #{Step.pt_rules()}

    Formato obrigatório (campos em português):
    {"paragrafo":"parágrafo curto em português sobre riscos naturais da região","tags":["rótulo opcional"]}
    tags é opcional. Se não puder concluir: {"skipped":true,"reason":"motivo curto"}
    """
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

  defp facts_line(bundle) do
    case Step.facts_text(bundle) do
      nil -> ""
      text -> "Dados do anúncio: #{text}"
    end
  end
end
