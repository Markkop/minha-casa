defmodule MinhaCasaAi.PortalSearches.UrlBuilders.ImovelWeb do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches.UrlBuilders.Shared

  def build(filter_set, opts \\ []) do
    max_pages = Keyword.get(opts, :max_pages, 1)
    transacao = Map.get(filter_set, "transacao", "venda")
    operacao = if transacao == "aluguel", do: "aluguel", else: "venda"
    uf = Map.get(filter_set, "uf", "sp")
    cidade = Map.get(filter_set, "cidade", "sao-paulo")
    tipo = Shared.imovelweb_tipo(Shared.primary_tipo(filter_set))
    quartos = List.first(Map.get(filter_set, "quartos", []))

    amenity_slugs =
      filter_set
      |> Map.get("amenidades", [])
      |> Enum.flat_map(fn
        "piscina" -> ["com-piscina"]
        "churrasqueira" -> ["com-churrasqueira"]
        "academia" -> ["com-academia"]
        "mobiliado" -> ["mobiliado"]
        "aceita_pets" -> ["permite-pet"]
        _ -> []
      end)

    urls =
      for bairro <- Shared.bairro_variants(filter_set),
          page <- Shared.pages(max_pages) do
        parts =
          [
            tipo <> "-" <> operacao,
            bairro,
            cidade,
            uf
          ]
          |> Enum.reject(&is_nil/1)
          |> Kernel.++(if quartos, do: ["#{quartos}-quartos"], else: [])
          |> Kernel.++(price_slug(filter_set))
          |> Kernel.++(area_slug(filter_set))
          |> Kernel.++(amenity_slugs)
          |> Kernel.++(if page > 1, do: ["pagina-#{page}"], else: [])

        "https://www.imovelweb.com.br/" <> Enum.join(parts, "-") <> ".html"
      end

    %{urls: urls, notes: ["ImovelWeb: concatenated path slugs ending in .html."]}
  end

  defp price_slug(%{"precoMin" => min, "precoMax" => max})
       when is_number(min) and is_number(max) do
    ["de-#{trunc(min)}-a-#{trunc(max)}-reais"]
  end

  defp price_slug(%{"precoMax" => max}) when is_number(max), do: ["ate-#{trunc(max)}-reais"]
  defp price_slug(_), do: []

  defp area_slug(%{"areaMin" => min}) when is_number(min), do: ["com-mais-de-#{trunc(min)}-m2"]
  defp area_slug(_), do: []
end
