defmodule MinhaCasaAi.Integrations.OpenAIListingParserPreferencesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.OpenAISchemas
  alias MinhaCasaAi.Workspace.ListingPreferences

  test "listing parse schema requires preferences object" do
    catalog = ListingPreferences.default_system_options()
    schema = OpenAISchemas.listing_parse_schema(catalog)
    listing_props = get_in(schema, ["properties", "listings", "items", "properties"])

    assert Map.has_key?(listing_props, "preferences")
    assert "preferences" in get_in(schema, ["properties", "listings", "items", "required"])
  end

  test "preference_list_for_prompt lists keys and labels" do
    text =
      ListingPreferences.preference_list_for_prompt([
        %{key: "piscina", label: "Piscina", source: "system", visible: true, sort_order: 0, legacy_key: "piscina"}
      ])

    assert text =~ "piscina: Piscina"
  end
end
