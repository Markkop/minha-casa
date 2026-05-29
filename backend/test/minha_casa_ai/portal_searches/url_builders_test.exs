defmodule MinhaCasaAi.PortalSearches.UrlBuildersTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PortalSearches.UrlBuilders

  @filter %{
    "transacao" => "venda",
    "uf" => "sp",
    "cidade" => "sao-paulo",
    "bairros" => ["pinheiros"],
    "tiposImovel" => ["apartamento"],
    "quartos" => [2],
    "banheiros" => [],
    "vagas" => [],
    "suites" => [],
    "precoMin" => nil,
    "precoMax" => 800_000,
    "areaMin" => nil,
    "areaMax" => nil,
    "condominioMax" => nil,
    "amenidades" => ["piscina"],
    "estagio" => []
  }

  test "zap builds sale apartment URL with query params" do
    %{urls: [url | _]} = UrlBuilders.build("zap", @filter)
    assert url =~ "zapimoveis.com.br/venda/apartamentos/sp+sao-paulo/pinheiros/"
    assert url =~ "precoMaximo=800000"
    assert url =~ "quartos=2"
    assert url =~ "amenidades=piscina"
    refute url =~ "pagina=2"
  end

  test "vivareal builds path with tipo slug" do
    %{urls: [url | _]} = UrlBuilders.build("vivareal", @filter)
    assert url =~ "vivareal.com.br/venda/sp/sao-paulo/pinheiros/apartamento_residencial/"
  end

  test "olx uses ps/pe query params" do
    filter = Map.merge(@filter, %{"precoMin" => 300_000})
    %{urls: [url | _]} = UrlBuilders.build("olx", filter)
    assert url =~ "olx.com.br/imoveis/venda/estado-sp/sao-paulo/apartamentos/pinheiros"
    assert url =~ "ps=300000"
    assert url =~ "pe=800000"
  end

  test "olx uses florianopolis-e-regiao slug for sc" do
    filter =
      Map.merge(@filter, %{
        "uf" => "sc",
        "cidade" => "florianopolis",
        "bairros" => ["itacorubi"]
      })

    %{urls: [url | _]} = UrlBuilders.build("olx", filter)
    assert url =~ "olx.com.br/imoveis/venda/estado-sc/florianopolis-e-regiao/itacorubi"
    refute url =~ "/apartamentos/itacorubi"
  end

  test "chaves na mao uses quartos path segment" do
    %{urls: [url | _]} = UrlBuilders.build("chavesnamao", @filter)
    assert url =~ "chavesnamao.com.br/apartamentos-a-venda/sp-sao-paulo/pinheiros/2-quartos/"
  end

  test "imovelweb ends with .html slug" do
    %{urls: [url | _]} = UrlBuilders.build("imovelweb", @filter)
    assert url =~ "imovelweb.com.br/apartamentos-venda-pinheiros-sao-paulo-sp-2-quartos"
    assert String.ends_with?(url, ".html")
  end
end
