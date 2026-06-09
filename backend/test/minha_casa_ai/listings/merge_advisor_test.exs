defmodule MinhaCasaAi.Listings.MergeAdvisorTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.MergeAdvisor

  @fields [
    %{"path" => "preco", "valueType" => "number"},
    %{"path" => "titulo", "valueType" => "text"},
    %{"path" => "preferences.piscina", "valueType" => "boolean"},
    %{"path" => "m2Privado", "valueType" => "number"}
  ]

  test "normalizes a valid duplicate verdict with suggestions" do
    raw = %{
      "verdict" => "duplicate",
      "confidence" => 0.92,
      "suggestions" => [
        %{"path" => "preco", "suggestedValue" => 1_100_000, "note" => "Preço mais recente."},
        %{"path" => "titulo", "suggestedValue" => "  Apto novo  ", "note" => nil},
        %{"path" => "preferences.piscina", "suggestedValue" => true, "note" => ""}
      ]
    }

    assert {:ok, advice} = MergeAdvisor.normalize(raw, @fields)
    assert advice["verdict"] == "duplicate"
    assert advice["confidence"] == 0.92

    assert advice["suggestions"] == [
             %{
               "path" => "preco",
               "suggestedValue" => 1_100_000,
               "note" => "Preço mais recente."
             },
             %{"path" => "titulo", "suggestedValue" => "Apto novo", "note" => nil},
             %{"path" => "preferences.piscina", "suggestedValue" => true, "note" => nil}
           ]
  end

  test "drops suggestions with unknown paths or mismatched types" do
    raw = %{
      "verdict" => "duplicate",
      "confidence" => 0.7,
      "suggestions" => [
        %{"path" => "naoExiste", "suggestedValue" => "x", "note" => nil},
        %{"path" => "preco", "suggestedValue" => "não numérico", "note" => nil},
        %{"path" => "preferences.piscina", "suggestedValue" => "talvez", "note" => nil},
        %{"path" => "titulo", "suggestedValue" => "   ", "note" => nil}
      ]
    }

    assert {:ok, advice} = MergeAdvisor.normalize(raw, @fields)
    assert advice["suggestions"] == []
  end

  test "coerces numeric strings for number fields" do
    raw = %{
      "verdict" => "duplicate",
      "confidence" => 1.5,
      "suggestions" => [
        %{"path" => "m2Privado", "suggestedValue" => "85,5", "note" => nil},
        %{"path" => "preco", "suggestedValue" => "1100000", "note" => nil}
      ]
    }

    assert {:ok, advice} = MergeAdvisor.normalize(raw, @fields)
    assert advice["confidence"] == 1.0

    assert Enum.map(advice["suggestions"], & &1["suggestedValue"]) == [85.5, 1_100_000]
  end

  test "distinct verdict discards suggestions" do
    raw = %{
      "verdict" => "distinct",
      "confidence" => 0.85,
      "suggestions" => [
        %{"path" => "preco", "suggestedValue" => 1, "note" => nil}
      ]
    }

    assert {:ok, advice} = MergeAdvisor.normalize(raw, @fields)
    assert advice["verdict"] == "distinct"
    assert advice["suggestions"] == []
  end

  test "rejects invalid verdicts" do
    assert {:error, :invalid_ai_json} = MergeAdvisor.normalize(%{"verdict" => "maybe"}, @fields)
    assert {:error, :invalid_ai_json} = MergeAdvisor.normalize(nil, @fields)
  end

  test "dedupes suggestions by path keeping the first one" do
    raw = %{
      "verdict" => "duplicate",
      "confidence" => 0.9,
      "suggestions" => [
        %{"path" => "preco", "suggestedValue" => 1_000, "note" => nil},
        %{"path" => "preco", "suggestedValue" => 2_000, "note" => nil}
      ]
    }

    assert {:ok, advice} = MergeAdvisor.normalize(raw, @fields)
    assert [%{"suggestedValue" => 1_000}] = advice["suggestions"]
  end
end
