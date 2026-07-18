defmodule MinhaCasaAi.Listings.ConstructionYearTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.ConstructionYear

  test "normalizes four-digit integer, float, and string years" do
    assert ConstructionYear.normalize(1000) == 1000
    assert ConstructionYear.normalize(2026.0) == 2026
    assert ConstructionYear.normalize(" 9999 ") == 9999
  end

  test "rejects values outside the persisted year contract" do
    for value <- [999, 10_000, 2026.5, "999", "2026-01-01", "ano 2026", nil, %{}] do
      assert ConstructionYear.normalize(value) == nil
    end
  end

  test "normalizes an explicitly present data field and preserves absent fields" do
    assert ConstructionYear.normalize_data(%{"constructionYear" => "1998", "price" => 1}) ==
             %{"constructionYear" => 1998, "price" => 1}

    assert ConstructionYear.normalize_data(%{"constructionYear" => ""}) == %{
             "constructionYear" => nil
           }

    assert ConstructionYear.normalize_data(%{"price" => 1}) == %{"price" => 1}
  end
end
