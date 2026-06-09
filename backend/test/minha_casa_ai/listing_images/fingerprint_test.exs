defmodule MinhaCasaAi.ListingImages.FingerprintTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.ListingImages.Fingerprint

  test "matches exact hashes regardless of perceptual metadata" do
    left = %{"sha256" => "same", "width" => 100, "height" => 100}
    right = %{"sha256" => "same", "width" => 200, "height" => 100}

    assert Fingerprint.duplicate?(left, right)
  end

  test "matches balanced perceptual hashes with similar aspect ratios" do
    left = %{
      "sha256" => "left",
      "dhash" => Base.encode64(<<0::64>>),
      "width" => 1_000,
      "height" => 750
    }

    close = %{
      "sha256" => "right",
      "dhash" => Base.encode64(<<1::64>>),
      "width" => 800,
      "height" => 600
    }

    different_aspect = %{close | "width" => 800, "height" => 400}

    assert Fingerprint.duplicate?(left, close)
    refute Fingerprint.duplicate?(left, different_aspect)
  end
end
