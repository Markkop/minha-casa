defmodule MinhaCasaAi.Integrations.OpenAIListingParserPreferencesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.{OpenAIListingParser, OpenAISchemas}
  alias MinhaCasaAi.Integrations.Langfuse.PromptDefinitions
  alias MinhaCasaAi.Workspace.ListingPreferences

  test "listing parse schema requires preferences object" do
    catalog = ListingPreferences.default_system_options()
    schema = OpenAISchemas.listing_parse_schema(catalog)
    listing_props = get_in(schema, ["properties", "listings", "items", "properties"])

    assert Map.has_key?(listing_props, "preferences")
    assert "preferences" in get_in(schema, ["properties", "listings", "items", "required"])
  end

  test "listing parse schema requires a nullable bounded construction year" do
    schema = OpenAISchemas.listing_parse_schema()
    listing = get_in(schema, ["properties", "listings", "items"])

    assert "anoConstrucao" in listing["required"]

    assert listing["properties"]["anoConstrucao"] == %{
             "type" => ["integer", "null"],
             "minimum" => 1000,
             "maximum" => 9999
           }
  end

  test "build_listing preserves and normalizes construction year" do
    catalog = ListingPreferences.default_system_options()

    listing =
      OpenAIListingParser.build_listing(
        %{"endereco" => "Rua A", "anoConstrucao" => "1998", "preferences" => %{}},
        catalog
      )

    assert listing["anoConstrucao"] == 1998
  end

  test "parser prompt derives explicit age using current year and accepts future completion" do
    prompt = PromptDefinitions.get("listing-parser/system")["prompt"]

    assert prompt =~ "anoConstrucao = {{current_year}} - 12"
    assert prompt =~ "previsão explícita de entrega"
    assert prompt =~ "mesmo quando o ano for futuro"
    assert prompt =~ "publicação, atualização, reforma ou revitalização"
  end

  test "preference_list_for_prompt lists keys and labels" do
    text =
      ListingPreferences.preference_list_for_prompt([
        %{key: "piscina", label: "Piscina", source: "system", visible: true, sort_order: 0, legacy_key: "piscina"}
      ])

    assert text =~ "piscina: Piscina"
  end
end
