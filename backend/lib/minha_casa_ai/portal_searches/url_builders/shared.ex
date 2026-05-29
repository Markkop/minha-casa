defmodule MinhaCasaAi.PortalSearches.UrlBuilders.Shared do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches.Limits

  def comma_list(values) when is_list(values) do
    values
    |> Enum.map(&to_string/1)
    |> Enum.join(",")
  end

  def primary_tipo(%{"tiposImovel" => [tipo | _]}), do: tipo
  def primary_tipo(_), do: "apartamento"

  def bairro_variants(%{"bairros" => []}), do: [nil]
  def bairro_variants(%{"bairros" => bairros}), do: bairros

  def pages(max_pages \\ Limits.default_max_pages()) do
    1..max(max_pages, 1)
  end

  def page_from_url(url) when is_binary(url) do
    uri = URI.parse(url)
    query = URI.decode_query(uri.query || "")

    cond do
      page = parse_page(query["pagina"]) -> page
      page = parse_page(query["o"]) -> page
      page = parse_page(query["pag"]) -> page
      true ->
        case Regex.run(~r/pagina-(\d+)/, uri.path || "") do
          [_, page] -> parse_page(page) || 1
          _ -> 1
        end
    end
  end

  def page_from_url(_), do: 1

  defp parse_page(value) when is_binary(value) do
    case Integer.parse(value) do
      {n, _} when n > 0 -> n
      _ -> nil
    end
  end

  defp parse_page(value) when is_integer(value) and value > 0, do: value
  defp parse_page(_), do: nil

  def append_query(base, params) when is_binary(base) and is_map(params) do
    filtered =
      params
      |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" or v == [] end)
      |> Map.new()

    if map_size(filtered) == 0 do
      base
    else
      sep = if String.contains?(base, "?"), do: "&", else: "?"
      base <> sep <> URI.encode_query(filtered)
    end
  end

  def zap_amenity_slug("piscina"), do: "piscina"
  def zap_amenity_slug("churrasqueira"), do: "churrasqueira"
  def zap_amenity_slug("academia"), do: "academia"
  def zap_amenity_slug("sacada"), do: "sacada"
  def zap_amenity_slug("varanda_gourmet"), do: "varanda"
  def zap_amenity_slug("mobiliado"), do: "mobiliado"
  def zap_amenity_slug("portaria_24h"), do: "portaria-24h"
  def zap_amenity_slug("elevador"), do: "elevador"
  def zap_amenity_slug("salao_de_festas"), do: "salao-de-festas"
  def zap_amenity_slug("playground"), do: "playground"
  def zap_amenity_slug("quadra"), do: "quadra-poliesportiva"
  def zap_amenity_slug("sauna"), do: "sauna"
  def zap_amenity_slug("seguranca_24h"), do: "seguranca-24h"
  def zap_amenity_slug("aceita_pets"), do: "aceita-animais"
  def zap_amenity_slug("proximo_metro"), do: nil
  def zap_amenity_slug(_), do: nil

  def zap_tipo_slug("apartamento"), do: {"apartamentos", "apartamento_residencial"}
  def zap_tipo_slug("casa"), do: {"casas", "casa_residencial"}
  def zap_tipo_slug("sobrado"), do: {"sobrados", "sobrado_residencial"}
  def zap_tipo_slug("cobertura"), do: {"coberturas", "cobertura_residencial"}
  def zap_tipo_slug("kitnet"), do: {"kitnets", "kitnet_residencial"}
  def zap_tipo_slug("studio"), do: {"studios", "studio_residencial"}
  def zap_tipo_slug("loft"), do: {"lofts", "loft_residencial"}
  def zap_tipo_slug("flat"), do: {"flats", "flat_residencial"}
  def zap_tipo_slug("casa_condominio"), do: {"casas", "casa_residencial"}
  def zap_tipo_slug("terreno"), do: {"terrenos", "terreno_residencial"}
  def zap_tipo_slug("sala_comercial"), do: {"salas-comerciais", "sala_comercial"}
  def zap_tipo_slug("galpao"), do: {"galpoes", "galpao_comercial"}
  def zap_tipo_slug(_), do: {"imoveis", "apartamento_residencial"}

  def vivareal_tipo_slug("apartamento"), do: "apartamento_residencial"
  def vivareal_tipo_slug("casa"), do: "casa_residencial"
  def vivareal_tipo_slug("sobrado"), do: "sobrado_residencial"
  def vivareal_tipo_slug("cobertura"), do: "cobertura_residencial"
  def vivareal_tipo_slug("kitnet"), do: "kitnet_residencial"
  def vivareal_tipo_slug("studio"), do: "studio_residencial"
  def vivareal_tipo_slug("loft"), do: "loft_residencial"
  def vivareal_tipo_slug("flat"), do: "flat_residencial"
  def vivareal_tipo_slug("terreno"), do: "terreno"
  def vivareal_tipo_slug("sala_comercial"), do: "sala_comercial"
  def vivareal_tipo_slug(_), do: "apartamento_residencial"

  def olx_tipo_path("apartamento"), do: "apartamentos"
  def olx_tipo_path("casa"), do: "casas"
  def olx_tipo_path("terreno"), do: "terrenos"
  def olx_tipo_path("sala_comercial"), do: "comercial"
  def olx_tipo_path(_), do: "apartamentos"

  def chaves_tipo_prefix("casa"), do: "casas"
  def chaves_tipo_prefix("sobrado"), do: "sobrados"
  def chaves_tipo_prefix("kitnet"), do: "kitnets"
  def chaves_tipo_prefix("casa_condominio"), do: "casas-em-condominio"
  def chaves_tipo_prefix(_), do: "apartamentos"

  def imovelweb_tipo("apartamento"), do: "apartamentos"
  def imovelweb_tipo("casa"), do: "casas"
  def imovelweb_tipo("terreno"), do: "terrenos"
  def imovelweb_tipo("sala_comercial"), do: "comerciais"
  def imovelweb_tipo(_), do: "apartamentos"

  def olx_cidade_slug("sc", "florianopolis"), do: "florianopolis-e-regiao"
  def olx_cidade_slug(_uf, cidade), do: cidade
end
