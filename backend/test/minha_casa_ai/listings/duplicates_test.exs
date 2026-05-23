defmodule MinhaCasaAi.Listings.DuplicatesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.Duplicates

  test "detects same URL as duplicate" do
    existing = %{
      id: "id-1",
      data: %{"link" => "https://example.com/a", "endereco" => "Rua A"}
    }

    candidate = %{"link" => "https://example.com/a", "endereco" => "Rua B"}

    [%{score: score, reason: reason}] = Duplicates.candidates([existing], candidate)

    assert score == 1.0
    assert reason == "same_url"
  end

  test "returns empty when no match" do
    existing = %{id: "id-1", data: %{"link" => "https://a.com", "endereco" => "Rua A"}}

    candidate = %{"link" => "https://b.com", "endereco" => "Rua B", "preco" => 100}

    assert Duplicates.candidates([existing], candidate) == []
  end
end
