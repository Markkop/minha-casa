defmodule MinhaCasaAi.Integrations.OpenAIListingParserFeaturesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Integrations.{OpenAIListingParser, OpenAISchemas}
  alias MinhaCasaAi.Integrations.Langfuse.PromptDefinitions
  alias MinhaCasaAi.Workspace.ListingFeatures

  test "listing parse schema requires features object" do
    catalog = ListingFeatures.default_system_options()
    schema = OpenAISchemas.listing_parse_schema(catalog)
    listing_props = get_in(schema, ["properties", "listings", "items", "properties"])

    assert Map.has_key?(listing_props, "features")
    assert "features" in get_in(schema, ["properties", "listings", "items", "required"])
  end

  test "listing parse schema requires a nullable bounded construction year" do
    schema = OpenAISchemas.listing_parse_schema()
    listing = get_in(schema, ["properties", "listings", "items"])

    assert "constructionYear" in listing["required"]

    assert listing["properties"]["constructionYear"] == %{
             "type" => ["integer", "null"],
             "minimum" => 1000,
             "maximum" => 9999
           }
  end

  test "build_listing preserves and normalizes construction year" do
    catalog = ListingFeatures.default_system_options()

    listing =
      OpenAIListingParser.build_listing(
        %{"address" => "Rua A", "constructionYear" => "1998", "features" => %{}},
        catalog
      )

    assert listing["constructionYear"] == 1998
  end

  test "parser prompt derives explicit age using current year and accepts future completion" do
    prompt = PromptDefinitions.get("listing-parser/system")["prompt"]

    assert prompt =~ "constructionYear = {{current_year}} - 12"
    assert prompt =~ "previsão explícita de entrega"
    assert prompt =~ "mesmo quando o ano for futuro"
    assert prompt =~ "publicação, atualização, reforma ou revitalização"
  end

  test "feature_list_for_prompt lists keys and labels" do
    text =
      ListingFeatures.feature_list_for_prompt([
        %{
          key: "pool",
          label: "Piscina",
          source: "system",
          visible: true,
          sort_order: 0,
          legacy_key: nil
        }
      ])

    assert text =~ "pool: Piscina"
  end
end
