defmodule MinhaCasaAi.Workspace.ListingPreferencesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Workspace.ListingPreferences
  alias MinhaCasaAi.Integrations.OpenAISchemas

  test "merge_catalog returns system defaults when empty" do
    catalog = ListingPreferences.merge_catalog([])

    assert length(catalog) == 9
    assert Enum.any?(catalog, &(&1.key == "portaria" and &1.label == "Portaria 24h"))
  end

  test "merge_catalog applies stored overrides for system keys" do
    row = %{
      key: "piscina",
      label: "Piscina aquecida",
      source: "system",
      visible: false,
      sort_order: 0,
      legacy_key: "piscina"
    }

    [piscina] =
      ListingPreferences.merge_catalog([row])
      |> Enum.filter(&(&1.key == "piscina"))

    assert piscina.label == "Piscina aquecida"
    assert piscina.visible == false
  end

  test "mirror_legacy_fields maps catalog keys to legacy booleans" do
    catalog = ListingPreferences.default_system_options()

    legacy =
      ListingPreferences.mirror_legacy_fields(
        %{"portaria" => true, "vista_livre" => false, "piscina_termica" => true},
        catalog
      )

    assert legacy["porteiro24h"] == true
    assert legacy["vistaLivre"] == false
    assert legacy["piscinaTermica"] == true
  end

  test "listing_parse_schema includes custom catalog keys in preferences object" do
    catalog =
      ListingPreferences.default_system_options() ++
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
    prefs = get_in(properties, ["preferences", "properties"])

    assert Map.has_key?(prefs, "area_gourmet")
    assert Map.has_key?(prefs, "piscina")
    refute Map.has_key?(properties, "piscina")
  end

  test "normalize_listing_preferences backfills from legacy fields" do
    catalog = ListingPreferences.default_system_options()

    prefs =
      ListingPreferences.normalize_listing_preferences(
        %{
          "porteiro24h" => true,
          "vistaLivre" => false,
          "preferences" => %{"esquina" => true}
        },
        catalog
      )

    assert prefs["portaria"] == true
    assert prefs["vista_livre"] == false
    assert prefs["esquina"] == true
  end
end
