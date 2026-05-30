defmodule MinhaCasaAi.ListingImages.VisualAnalysisTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.ListingImages.VisualAnalysis

  @generated_at ~U[2026-01-01 00:00:00Z]

  describe "analysis_from_features/3" do
    test "orders all valid image indices once" do
      features = [
        feature(0, "0000000000000000", [0, 0, 0]),
        feature(2, "ffffffffffffffff", [255, 255, 255]),
        feature(1, "000000000000000f", [10, 10, 10])
      ]

      analysis = VisualAnalysis.analysis_from_features(features, 3, generated_at: @generated_at)

      assert analysis["schemaVersion"] == 1
      assert analysis["generatedAt"] == "2026-01-01T00:00:00Z"
      assert analysis["order"] == [0, 1, 2]
      assert Enum.sort(analysis["order"]) == [0, 1, 2]
    end

    test "starts from cover index when provided" do
      features = [
        feature(0, "0000000000000000", [0, 0, 0]),
        feature(1, "ffffffffffffffff", [255, 255, 255]),
        feature(2, "fffffffffffffff0", [245, 245, 245])
      ]

      analysis =
        VisualAnalysis.analysis_from_features(features, 3,
          cover_index: 1,
          generated_at: @generated_at
        )

      assert hd(analysis["order"]) == 1
      assert Enum.sort(analysis["order"]) == [0, 1, 2]
    end

    test "appends images whose feature extraction failed in original order" do
      analysis =
        VisualAnalysis.analysis_from_features([feature(1, "0000000000000000", [0, 0, 0])], 3,
          generated_at: @generated_at
        )

      assert analysis["order"] == [0, 1, 2]
      assert Enum.map(analysis["features"], & &1["index"]) == [1]
    end
  end

  defp feature(index, hash, color) do
    %{
      "index" => index,
      "dhash" => hash,
      "hashSizeBits" => 64,
      "dominantColor" => color,
      "palette" => [color],
      "width" => 16,
      "height" => 16
    }
  end
end
