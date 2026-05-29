defmodule MinhaCasaAi.PortalSearches.UrlBuilders do
  @moduledoc false

  alias MinhaCasaAi.PortalSearches.UrlBuilders.{
    ChavesNaMao,
    ImovelWeb,
    Olx,
    VivaReal,
    Zap
  }

  @portals ~w(zap vivareal olx chavesnamao imovelweb)

  def portals, do: @portals

  def build(portal, filter_set, opts \\ []) do
    if portal in @portals and is_map(filter_set) do
      case portal do
        "zap" -> Zap.build(filter_set, opts)
        "vivareal" -> VivaReal.build(filter_set, opts)
        "olx" -> Olx.build(filter_set, opts)
        "chavesnamao" -> ChavesNaMao.build(filter_set, opts)
        "imovelweb" -> ImovelWeb.build(filter_set, opts)
      end
    else
      %{urls: [], notes: ["Unknown portal"]}
    end
  end
end
