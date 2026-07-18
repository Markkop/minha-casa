defmodule MinhaCasaAi.PortalSearches.UrlBuilders.Olx do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches.UrlBuilders.Shared

  @olx_amenities %{
    "piscina" => "pool",
    "churrasqueira" => "barbecue_grill",
    "academia" => "gym",
    "mobiliado" => "furnished",
    "portaria_24h" => "concierge_24h",
    "elevador" => "elevator",
    "salao_de_festas" => "party_hall",
    "aceita_pets" => "pets_allowed",
    "ar_condicionado" => "air_conditioning",
    "armarios_cozinha" => "cabinets_kitchen",
    "armarios_quarto" => "cabinets_bedroom",
    "sacada" => "balcony",
    "varanda_gourmet" => "balcony"
  }

  def build(filter_set, opts \\ []) do
    max_pages = Keyword.get(opts, :max_pages, 1)
    transacao = Map.get(filter_set, "transacao", "venda")
    trans_path = if transacao == "aluguel", do: "aluguel", else: "venda"
    uf = Map.get(filter_set, "uf", "sp")
    cidade = Shared.olx_cidade_slug(uf, Map.get(filter_set, "cidade", "sao-paulo"))
    tipo_path = Shared.olx_tipo_path(Shared.primary_tipo(filter_set))

    amenity_params =
      filter_set
      |> Map.get("amenidades", [])
      |> Enum.reduce(%{}, fn amenity, acc ->
        case Map.get(@olx_amenities, amenity) do
          nil -> acc
          key -> Map.put(acc, key, "1")
        end
      end)

    urls =
      for bairro <- Shared.bairro_variants(filter_set),
          page <- Shared.pages(max_pages) do
        base =
          [
            "https://www.olx.com.br/imoveis",
            trans_path,
            "estado-#{uf}",
            cidade
          ]
          |> olx_path_segments(bairro, tipo_path)
          |> Enum.join("/")

        params =
          %{
            "ps" => filter_set["precoMin"],
            "pe" => filter_set["precoMax"],
            "rooms" =>
              if(filter_set["quartos"] != [], do: Shared.comma_list(filter_set["quartos"])),
            "bathrooms" =>
              if(filter_set["banheiros"] != [], do: Shared.comma_list(filter_set["banheiros"])),
            "garage_spaces" =>
              if(filter_set["vagas"] != [], do: Shared.comma_list(filter_set["vagas"])),
            "size" => filter_set["areaMin"],
            "size_e" => filter_set["areaMax"],
            "o" => if(page > 1, do: page)
          }
          |> Map.merge(amenity_params)

        Shared.append_query(base, params)
      end

    %{
      urls: urls,
      notes: ["OLX: bairro como segmento de path; cidades metro usam sufixo -e-regiao."]
    }
  end

  defp olx_path_segments(segments, bairro, tipo_path) do
    cidade = Enum.at(segments, -1)

    cond do
      is_binary(bairro) and String.ends_with?(cidade, "-e-regiao") ->
        segments ++ [bairro]

      is_binary(bairro) ->
        segments ++ [tipo_path, bairro]

      true ->
        segments ++ [tipo_path]
    end
  end
end
