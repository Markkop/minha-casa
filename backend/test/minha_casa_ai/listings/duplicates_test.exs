defmodule MinhaCasaAi.Listings.DuplicatesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.Duplicates

  @cover_fingerprint %{
    "sha256" => "abc123",
    "dhash" => Base.encode64(<<1, 2, 3, 4, 5, 6, 7, 8>>),
    "width" => 800,
    "height" => 600
  }

  defp listing(data), do: %{id: Ecto.UUID.generate(), data: data}

  test "exact url match wins" do
    result =
      Duplicates.score_duplicate(
        listing(%{"link" => "https://portal.com/1"}),
        %{"link" => "https://portal.com/1"}
      )

    assert result.score == 1.0
    assert result.reason == "same_url"
  end

  test "matching cover fingerprint alone is a candidate" do
    result =
      Duplicates.score_duplicate(
        listing(%{"endereco" => "Rua A", "imageFingerprints" => [@cover_fingerprint]}),
        %{"endereco" => "Rua B"},
        cover_fingerprint: @cover_fingerprint
      )

    assert result.score == 0.8
    assert result.reason == "similar_cover_image"
  end

  test "address plus cover fingerprint scores above address plus price" do
    result =
      Duplicates.score_duplicate(
        listing(%{"endereco" => "Rua A, 10", "imageFingerprints" => [@cover_fingerprint]}),
        %{"endereco" => "rua a, 10"},
        cover_fingerprint: @cover_fingerprint
      )

    assert result.score == 0.9
    assert result.reason == "same_address_similar_cover"
  end

  test "ignores cover fingerprint when listing has no fingerprints" do
    result =
      Duplicates.score_duplicate(
        listing(%{"endereco" => "Rua A"}),
        %{"endereco" => "Rua B"},
        cover_fingerprint: @cover_fingerprint
      )

    assert result.score == 0.0
    assert result.reason == "none"
  end

  test "candidates accepts cover fingerprint option and filters by threshold" do
    matching = listing(%{"endereco" => "Rua X", "imageFingerprints" => [@cover_fingerprint]})
    unrelated = listing(%{"endereco" => "Rua Y"})

    candidates =
      Duplicates.candidates([matching, unrelated], %{"endereco" => "Rua Z"},
        cover_fingerprint: @cover_fingerprint
      )

    assert [%{reason: "similar_cover_image", listingId: listing_id}] = candidates
    assert listing_id == matching.id
  end

  test "heuristics still work without options" do
    result =
      Duplicates.score_duplicate(
        listing(%{"endereco" => "Rua A", "preco" => 500_000}),
        %{"endereco" => "Rua A", "preco" => 500_000}
      )

    assert result.score == 0.85
    assert result.reason == "same_address_price"
  end
end
