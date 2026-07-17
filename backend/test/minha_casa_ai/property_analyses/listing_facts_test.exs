defmodule MinhaCasaAi.PropertyAnalyses.ListingFactsTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses.ListingFacts

  test "hints_text labels casa areas as terreno and construído" do
    facts = %{
      "tipoImovel" => "casa",
      "m2Totais" => 300,
      "m2Privado" => 180
    }

    text = ListingFacts.hints_text(facts)

    assert text =~ "m2Totais (terreno): 300"
    assert text =~ "m2Privado (construído): 180"
  end

  test "hints_text labels apartamento areas as total and privativa" do
    facts = %{
      "tipoImovel" => "apartamento",
      "m2Totais" => 120,
      "m2Privado" => 95
    }

    text = ListingFacts.hints_text(facts)

    assert text =~ "m2Totais (área total): 120"
    assert text =~ "m2Privado (área privativa): 95"
  end

  test "preserves construction year as an analysis fact" do
    facts = ListingFacts.from_listing_data(%{"anoConstrucao" => 1998, "preco" => 900_000})

    assert facts == %{"anoConstrucao" => 1998}
    assert ListingFacts.hints_text(facts) =~ "anoConstrucao: 1998"
  end
end
