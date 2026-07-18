defmodule MinhaCasaAi.Workspace.ListingFeaturesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Workspace.ListingFeatures
  alias MinhaCasaAi.Integrations.OpenAISchemas

  test "merge_catalog returns system defaults when empty" do
    catalog = ListingFeatures.merge_catalog([])

    assert length(catalog) == 9
    assert Enum.any?(catalog, &(&1.key == "doorman24h" and &1.label == "Portaria 24h"))
  end

  test "merge_catalog applies stored overrides for system keys" do
    row = %{
      key: "pool",
      label: "Piscina aquecida",
      source: "system",
      visible: false,
      sort_order: 0,
      legacy_key: nil
    }

    [pool] =
      ListingFeatures.merge_catalog([row])
      |> Enum.filter(&(&1.key == "pool"))

    assert pool.label == "Piscina aquecida"
    assert pool.visible == false
  end

  test "listing_parse_schema includes custom catalog keys in features object" do
    catalog =
      ListingFeatures.default_system_options() ++
        [
          %{
            key: "area_gourmet",
            label: "Área gourmet",
            source: "custom",
            visible: true,
            sort_order: 99,
            legacy_key: nil
          }
        ]

    properties = OpenAISchemas.listing_fields_properties(catalog)
    features = get_in(properties, ["features", "properties"])

    assert Map.has_key?(features, "area_gourmet")
    assert Map.has_key?(features, "pool")
    refute Map.has_key?(properties, "pool")
  end

  test "normalize_listing_features returns canonical catalog feature values" do
    catalog = ListingFeatures.default_system_options()

    prefs =
      ListingFeatures.normalize_listing_features(
        %{
          "features" => %{
            "doorman24h" => true,
            "unobstructedView" => false,
            "cornerLot" => true
          }
        },
        catalog
      )

    assert prefs["doorman24h"] == true
    assert prefs["unobstructedView"] == false
    assert prefs["cornerLot"] == true
  end
end
