defmodule MinhaCasaAi.PortalSearches.UrlBuilders.ChavesNaMao do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches.UrlBuilders.Shared

  def build(filter_set, opts \\ []) do
    max_pages = Keyword.get(opts, :max_pages, 1)
    transacao = Map.get(filter_set, "transacao", "venda")
    suffix = if transacao == "aluguel", do: "para-alugar", else: "a-venda"
    uf = Map.get(filter_set, "uf", "sp")
    cidade = Map.get(filter_set, "cidade", "sao-paulo")
    prefix = Shared.chaves_tipo_prefix(Shared.primary_tipo(filter_set))
    quartos = List.first(Map.get(filter_set, "quartos", []))

    urls =
      for bairro <- Shared.bairro_variants(filter_set),
          page <- Shared.pages(max_pages) do
        segments =
          [
            "https://www.chavesnamao.com.br",
            "#{prefix}-#{suffix}",
            "#{uf}-#{cidade}"
          ]
          |> maybe_append(bairro)
          |> maybe_append_quartos(quartos)
          |> Enum.join("/")
          |> Kernel.<>("/")

        query = if page > 1, do: "?pag=#{page}", else: ""
        segments <> query
      end

    %{urls: urls, notes: ["Chaves na Mão: path-slug filters; only first quartos value encoded."]}
  end

  defp maybe_append(segments, nil), do: segments
  defp maybe_append(segments, bairro), do: segments ++ [bairro]

  defp maybe_append_quartos(segments, nil), do: segments
  defp maybe_append_quartos(segments, n), do: segments ++ ["#{n}-quartos"]
end
