defmodule MinhaCasaAi.PropertyAnalyses.ListingFactsTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses.ListingFacts

  test "hints_text labels casa areas as terreno and construído" do
    facts = %{
      "propertyType" => "house",
      "totalAreaM2" => 300,
      "privateAreaM2" => 180
    }

    text = ListingFacts.hints_text(facts)

    assert text =~ "totalAreaM2 (terreno): 300"
    assert text =~ "privateAreaM2 (construído): 180"
  end

  test "hints_text labels apartamento areas as total and privativa" do
    facts = %{
      "propertyType" => "apartment",
      "totalAreaM2" => 120,
      "privateAreaM2" => 95
    }

    text = ListingFacts.hints_text(facts)

    assert text =~ "totalAreaM2 (área total): 120"
    assert text =~ "privateAreaM2 (área privativa): 95"
  end

  test "preserves construction year as an analysis fact" do
    facts = ListingFacts.from_listing_data(%{"anoConstrucao" => 1998, "preco" => 900_000})

    assert facts == %{"constructionYear" => 1998}
    assert ListingFacts.hints_text(facts) =~ "constructionYear: 1998"
  end
end
