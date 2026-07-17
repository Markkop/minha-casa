defmodule MinhaCasaAi.Listings.MergeSessionsTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.{ListingMergeSession, MergeSessions}

  test "only exposes meaningful content field changes" do
    current = %{
      "preco" => 1_000_000,
      "quartos" => 2,
      "starred" => true,
      "addedAt" => "2026-01-01",
      "preferences" => %{"sol_manha" => false}
    }

    imported = %{
      "preco" => 1_100_000,
      "quartos" => nil,
      "starred" => false,
      "addedAt" => "2026-06-09",
      "preferences" => %{"sol_manha" => true, "silencioso" => nil}
    }

    fields = MergeSessions.field_differences(current, imported)

    assert Enum.map(fields, & &1["path"]) == ["preco", "preferences.sol_manha"]
    refute Enum.any?(fields, &(&1["path"] in ["starred", "addedAt", "quartos"]))
  end

  test "retains meaningful false and zero values" do
    fields =
      MergeSessions.field_differences(
        %{"garagem" => 2, "piscina" => true},
        %{"garagem" => 0, "piscina" => false}
      )

    assert Enum.map(fields, &{&1["path"], &1["incomingValue"]}) == [
             {"garagem", 0},
             {"piscina", false}
           ]

    assert Enum.all?(fields, &Map.has_key?(&1, "valueType"))
    assert field_value_type(fields, "garagem") == "number"
    assert field_value_type(fields, "piscina") == "boolean"
  end

  test "exposes normalized construction year as a mergeable field" do
    fields =
      MergeSessions.field_differences(
        %{"anoConstrucao" => 1990},
        %{"anoConstrucao" => "1998"}
      )

    assert [field] = Enum.filter(fields, &(&1["path"] == "anoConstrucao"))
    assert field["label"] == "Ano de construção"
    assert field["valueType"] == "number"
    assert field["currentValue"] == 1990
    assert field["incomingValue"] == 1998
  end

  test "does not expose an invalid construction year for merge" do
    fields =
      MergeSessions.field_differences(
        %{"anoConstrucao" => 1990},
        %{"anoConstrucao" => 10_000}
      )

    refute Enum.any?(fields, &(&1["path"] == "anoConstrucao"))
  end

  defp field_value_type(fields, path) do
    fields
    |> Enum.find(&(&1["path"] == path))
    |> Map.fetch!("valueType")
  end

  test "session_json gallery includes existing and imported url-only images" do
    listing_id = Ecto.UUID.generate()

    session = %ListingMergeSession{
      id: Ecto.UUID.generate(),
      target_listing_id: listing_id,
      current_data: %{
        "imageUrls" => ["https://example.com/current.jpg"]
      },
      imported_data: %{
        "imageUrls" => ["https://example.com/imported.jpg"]
      },
      payload: %{
        "images" => [],
        "skipped" => [],
        "stats" => %{"duplicates" => 0, "failed" => 0, "limitSkipped" => 0}
      },
      status: "ready",
      expires_at: DateTime.utc_now() |> DateTime.add(1_800, :second) |> DateTime.truncate(:second)
    }

    gallery = MergeSessions.session_json(session).gallery

    assert Enum.any?(gallery, &(&1["status"] == "existing"))
    assert Enum.any?(gallery, &(&1["status"] == "new"))
    assert length(gallery) >= 2
  end

  test "session_json exposes advisor verdict, suggestions and signals" do
    session = %ListingMergeSession{
      id: Ecto.UUID.generate(),
      target_listing_id: Ecto.UUID.generate(),
      current_data: %{"imageUrls" => ["https://example.com/current.jpg"]},
      imported_data: %{},
      payload: %{
        "fields" => [],
        "images" => [],
        "skipped" => [],
        "stats" => %{"duplicates" => 1, "failed" => 0, "limitSkipped" => 0},
        "verdict" => "duplicate",
        "confidence" => 0.9,
        "suggestions" => [
          %{"path" => "preco", "suggestedValue" => 1_100_000, "note" => "Preço mais recente."}
        ],
        "signals" => %{"reason" => "same_address", "score" => 0.76, "matchingImages" => 1}
      },
      status: "ready",
      expires_at: DateTime.utc_now() |> DateTime.add(1_800, :second) |> DateTime.truncate(:second)
    }

    json = MergeSessions.session_json(session)

    assert json.verdict == "duplicate"
    assert json.confidence == 0.9
    assert [%{"path" => "preco"}] = json.suggestions
    assert json.signals["reason"] == "same_address"
  end

  test "session_json defaults advisor fields when payload has none" do
    session = %ListingMergeSession{
      id: Ecto.UUID.generate(),
      target_listing_id: Ecto.UUID.generate(),
      current_data: %{"imageUrls" => ["https://example.com/current.jpg"]},
      imported_data: %{},
      payload: %{"fields" => [], "images" => [], "skipped" => [], "stats" => %{}},
      status: "ready",
      expires_at: DateTime.utc_now() |> DateTime.add(1_800, :second) |> DateTime.truncate(:second)
    }

    json = MergeSessions.session_json(session)

    assert json.verdict == nil
    assert json.suggestions == []
    assert json.signals == %{}
  end
end
