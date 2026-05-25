defmodule MinhaCasaAi.Integrations.SavedLinkMetadata.DeconstructTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.SavedLinkMetadata.Deconstruct

  test "parses vivareal filters and map region" do
    d =
      Deconstruct.deconstruct_url(
        "https://www.vivareal.com.br/venda/brasil/apartamento_residencial/?quartos=3,4&viewport=-48.65,-27.02|-48.68,-27.04&ordem=LOWEST_PRICE"
      )

    assert d.hints[:quartos] == "3-4 quartos"
    assert d.hints[:ordem] == "menor preço"
    assert d.hints[:map_region] == "Florianópolis"
    assert d.hints[:location_label] == "Florianópolis"
  end

  test "parses daga imoveis neighborhood and price" do
    d =
      Deconstruct.deconstruct_url(
        "https://dagaimoveis.com.br/comprar/casa-padrao/florianopolis-sc+florianopolis-sc-itacorubi?minValue=1.000.000,00&maxValue=3.000.000,00"
      )

    assert d.hints[:listing_type] == "casas"
    assert d.hints[:neighborhood] == "itacorubi"
    assert d.hints[:city] == "Florianópolis"
    assert d.hints[:location_label] == "Itacorubi, Florianópolis"
    assert d.hints[:price_range] =~ "R$"
  end

  test "region hint from viewport" do
    assert Deconstruct.region_hint_from_viewport(
             "-48.6507496606844,-27.01718372343871|-48.676026798440745,-27.042910917425317"
           ) == "Florianópolis"
  end
end
