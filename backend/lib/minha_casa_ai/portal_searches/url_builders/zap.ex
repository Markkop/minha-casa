defmodule MinhaCasaAi.PortalSearches.UrlBuilders.Zap do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches.UrlBuilders.Shared

  def build(filter_set, opts \\ []) do
    max_pages = Keyword.get(opts, :max_pages, 1)
    transacao = Map.get(filter_set, "transacao", "venda")
    trans_path = if transacao == "aluguel", do: "aluguel", else: "venda"
    trans_query = if transacao == "aluguel", do: "Aluguel", else: "Venda"
    uf = Map.get(filter_set, "uf", "sp")
    cidade = Map.get(filter_set, "cidade", "sao-paulo")
    tipo = Shared.primary_tipo(filter_set)
    {path_tipo, tipos_param} = Shared.zap_tipo_slug(tipo)

    amenidades =
      filter_set
      |> Map.get("amenidades", [])
      |> Enum.map(&Shared.zap_amenity_slug/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.join(",")

    urls =
      for bairro <- Shared.bairro_variants(filter_set),
          page <- Shared.pages(max_pages) do
        base =
          [
            "https://www.zapimoveis.com.br",
            trans_path,
            path_tipo,
            "#{uf}+#{cidade}"
          ]
          |> maybe_append(bairro)
          |> Enum.join("/")
          |> Kernel.<>("/")

        params = %{
          "transacao" => trans_query,
          "tipos" => tipos_param,
          "precoMinimo" => filter_set["precoMin"],
          "precoMaximo" => filter_set["precoMax"],
          "quartos" =>
            if(filter_set["quartos"] != [], do: Shared.comma_list(filter_set["quartos"])),
          "banheiros" =>
            if(filter_set["banheiros"] != [], do: Shared.comma_list(filter_set["banheiros"])),
          "vagas" => if(filter_set["vagas"] != [], do: Shared.comma_list(filter_set["vagas"])),
          "areaMinima" => filter_set["areaMin"],
          "areaMaxima" => filter_set["areaMax"],
          "valorCondominioMaximo" => filter_set["condominioMax"],
          "amenidades" => if(amenidades != "", do: amenidades),
          "proximoMetro" =>
            if("proximo_metro" in Map.get(filter_set, "amenidades", []), do: "true"),
          "pagina" => if(page > 1, do: page)
        }

        Shared.append_query(base, params)
      end

    %{urls: urls, notes: ["Zap: one URL per bairro (or city-wide when none selected)."]}
  end

  defp maybe_append(segments, nil), do: segments
  defp maybe_append(segments, bairro), do: segments ++ [bairro]
end
