defmodule MinhaCasaAi.PropertyAnalyses.HermesSteps.Mercado do
  @behaviour MinhaCasaAi.PropertyAnalyses.HermesSteps.Behaviour

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.Step

  @impl true
  def key, do: "mercado"

  @impl true
  def prompt(bundle, address, _opts) do
    ctx = Jason.encode!(Step.location_context(bundle, address))
    input = Step.read_input_json(bundle)
    listing_data = Map.get(bundle, :listing_data) || %{}

    price_hint =
      [
        Map.get(listing_data, "preco"),
        Map.get(listing_data, "valor"),
        Map.get(listing_data, "precoVenda"),
        Map.get(listing_data, "m2Privado"),
        Map.get(listing_data, "m2Totais")
      ]
      |> Enum.reject(&is_nil/1)
      |> Jason.encode!()

    """
    Pesquise o mercado imobiliário da região: preço médio/m² no bairro, em bairros similares e na cidade.
    Compare com o anúncio quando possível.

    Contexto: #{ctx}
    Dados de preço/m² do anúncio: #{price_hint}
    regionId: #{inspect(Map.get(input, "regionId") || Map.get(listing_data, "regionId"))}
    #{facts_line(bundle)}

    #{Step.pt_rules()}

    Formato:
    {
      "paragrafo": "parágrafo curto em português",
      "precoRegiaoM2": number,
      "precoSimilaresM2": number,
      "precoCidadeM2": number,
      "precoAnuncioM2": number
    }
    Números são opcionais mas desejáveis; use null se desconhecido.
    """
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
