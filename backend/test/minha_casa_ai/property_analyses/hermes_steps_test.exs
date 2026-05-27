defmodule MinhaCasaAi.PropertyAnalyses.HermesStepsTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses.HermesSteps.{
    Ambientes,
    Clima,
    Idade,
    Mercado,
    Riscos,
    Xray
  }

  @bundle %{catalog_count: 5, listing_facts: %{"cidade" => "Florianópolis"}}

  describe "Clima" do
    test "normalize happy path" do
      raw = %{
        "resumo" => "Clima subtropical.",
        "temperaturas" => %{"minC" => 15, "maxC" => 32, "descricao" => "Verões quentes."},
        "umidade" => %{"minPct" => 60, "maxPct" => 90, "descricao" => "Alta umidade."},
        "chuva" => %{"descricao" => "Chuvas no verão.", "mmAnualEstimado" => 1500}
      }

      result = Clima.normalize(raw, @bundle)
      assert result["resumo"] == "Clima subtropical."
      assert result["temperaturas"]["minC"] == 15.0
    end

    test "normalize skipped" do
      result = Clima.normalize(%{"skipped" => true, "reason" => "no_city"}, @bundle)
      assert result["skipped"] == true
    end
  end

  describe "Riscos" do
    test "normalize paragrafo" do
      result = Riscos.normalize(%{"paragrafo" => "Risco de vento.", "tags" => ["vento"]}, @bundle)
      assert result["paragrafo"] == "Risco de vento."
      assert "vento" in result["tags"]
    end

    test "normalize accepts top-level string paragraph" do
      result = Riscos.normalize("Risco moderado de enchentes em períodos de chuva intensa.", @bundle)
      assert String.contains?(result["paragrafo"], "enchentes")
    end
  end

  describe "Mercado" do
    test "normalize prices" do
      result =
        Mercado.normalize(
          %{"paragrafo" => "Mercado aquecido.", "precoRegiaoM2" => 12000},
          @bundle
        )

      assert result["precoRegiaoM2"] == 12000.0
    end
  end

  describe "Ambientes" do
    test "normalize cards with ordinals for multi categories" do
      raw = %{
        "resumoGeral" => "Imóvel amplo.",
        "cards" => [
          %{
            "id" => "quarto-a",
            "categoria" => "quarto",
            "imageIndices" => [0, 1],
            "estrutura" => [%{"tipo" => "piso", "material" => "porcelanato"}],
            "instalacoes" => [],
            "moveis" => []
          },
          %{
            "id" => "quarto-b",
            "categoria" => "quarto",
            "imageIndices" => [2],
            "estrutura" => [],
            "instalacoes" => [],
            "moveis" => []
          },
          %{
            "id" => "cozinha",
            "categoria" => "cozinha",
            "imageIndices" => [3],
            "estrutura" => [],
            "instalacoes" => [],
            "moveis" => []
          }
        ],
        "semCategoria" => %{"imageIndices" => [4]}
      }

      result = Ambientes.normalize(raw, @bundle)
      assert length(result["cards"]) == 3

      quartos =
        Enum.filter(result["cards"], fn c -> c["categoria"] == "quarto" end)

      assert length(quartos) == 2
      ordinals = Enum.map(quartos, & &1["ordinal"]) |> Enum.sort()
      assert ordinals == [1, 2]

      Enum.each(result["cards"], fn card ->
        assert card["xrayStatus"] == "waiting"
        assert card["pontosAtencao"] == []
      end)
    end

    test "unknown categoria routes images to semCategoria" do
      raw = %{
        "resumoGeral" => "Teste",
        "cards" => [
          %{
            "id" => "bad",
            "categoria" => "Bedroom",
            "imageIndices" => [0, 1],
            "estrutura" => [],
            "instalacoes" => [],
            "moveis" => []
          },
          %{
            "id" => "cozinha",
            "categoria" => "cozinha",
            "imageIndices" => [2],
            "estrutura" => [],
            "instalacoes" => [],
            "moveis" => []
          }
        ]
      }

      result = Ambientes.normalize(raw, @bundle)
      assert length(result["cards"]) == 1
      assert hd(result["cards"])["categoria"] == "cozinha"
      sem = result["semCategoria"]["imageIndices"]
      assert 0 in sem
      assert 1 in sem
    end

    test "normalize inventory items with tipo/material/detalhe shape" do
      raw = %{
        "resumoGeral" => "Teste",
        "cards" => [
          %{
            "id" => "sala",
            "categoria" => "sala",
            "imageIndices" => [0],
            "estrutura" => [
              %{"tipo" => "piso", "material" => "porcelanato", "detalhe" => "60x60"},
              %{"tipo" => "item customizado"}
            ],
            "instalacoes" => [%{"tipo" => "luminária", "material" => "metal"}],
            "moveis" => [%{"tipo" => "sofá", "material" => "tecido", "detalhe" => ""}]
          }
        ]
      }

      result = Ambientes.normalize(raw, @bundle)
      card = hd(result["cards"])

      [piso | rest_estrutura] = card["estrutura"]
      assert piso["tipo"] == "piso"
      assert piso["material"] == "porcelanato"
      assert piso["detalhe"] == "60x60"
      assert hd(rest_estrutura)["tipo"] == "item customizado"
      refute Map.has_key?(hd(rest_estrutura), "material")

      assert hd(card["instalacoes"])["tipo"] == "luminária"
      assert hd(card["instalacoes"])["material"] == "metal"

      moveis_item = hd(card["moveis"])
      assert moveis_item["tipo"] == "sofá"
      assert moveis_item["material"] == "tecido"
      refute Map.has_key?(moveis_item, "detalhe")
    end

    test "normalize accepts legacy rotulo as tipo" do
      raw = %{
        "resumoGeral" => "Teste",
        "cards" => [
          %{
            "id" => "cozinha",
            "categoria" => "cozinha",
            "imageIndices" => [0],
            "estrutura" => [%{"rotulo" => "bancada de granito"}],
            "instalacoes" => [],
            "moveis" => []
          }
        ]
      }

      result = Ambientes.normalize(raw, @bundle)
      assert hd(hd(result["cards"])["estrutura"])["tipo"] == "bancada de granito"
    end
  end

  describe "Idade" do
    test "normalize estimativa" do
      result =
        Idade.normalize(
          %{
            "estimativaAnos" => 15,
            "resumo" => "Imóvel relativamente novo.",
            "sinaisVistos" => ["Revestimentos recentes"]
          },
          @bundle
        )

      assert result["estimativaAnos"] == 15
    end
  end

  describe "Xray" do
    test "normalize pads to 3 pontos with stable ids" do
      pontos =
        Xray.normalize_pontos(
          %{
            "pontosAtencao" => [
              %{
                "titulo" => "Umidade no rodapé",
                "descricao" => "Madeira exposta à umidade alta.",
                "custoMinBrl" => 2000,
                "custoMaxBrl" => 8000
              }
            ]
          },
          "quarto-1"
        )

      assert length(pontos) == 3
      assert Enum.at(pontos, 0)["id"] == "quarto-1-xray-1"
      assert Enum.at(pontos, 2)["id"] == "quarto-1-xray-3"
    end

    test "normalize swaps min greater than max" do
      [ponto | _] =
        Xray.normalize_pontos(
          %{
            "pontosAtencao" => [
              %{
                "titulo" => "Vedação",
                "descricao" => "Esquadria com folga.",
                "custoMinBrl" => 5000,
                "custoMaxBrl" => 1000
              }
            ]
          },
          "sala-1"
        )

      assert ponto["custoMinBrl"] == 5000
      assert ponto["custoMaxBrl"] == 5000
    end
  end
end
