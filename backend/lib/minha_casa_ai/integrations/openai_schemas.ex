defmodule MinhaCasaAi.Integrations.OpenAISchemas do
  @moduledoc false
  # JSON schemas for OpenAI Responses structured outputs (strict mode).

  alias MinhaCasaAi.Workspace.ListingPreferences

  def listing_base_properties do
    %{
      "titulo" => %{"type" => ["string", "null"]},
      "endereco" => %{"type" => ["string", "null"]},
      "bairro" => %{"type" => ["string", "null"]},
      "cidade" => %{"type" => ["string", "null"]},
      "m2Totais" => %{"type" => ["number", "null"]},
      "m2Privado" => %{"type" => ["number", "null"]},
      "quartos" => %{"type" => ["number", "null"]},
      "suites" => %{"type" => ["number", "null"]},
      "banheiros" => %{"type" => ["number", "null"]},
      "garagem" => %{"type" => ["number", "null"]},
      "preco" => %{"type" => ["number", "null"]},
      "tipoImovel" => %{"type" => ["string", "null"]},
      "condominiumName" => %{"type" => ["string", "null"]},
      "contactName" => %{"type" => ["string", "null"]},
      "contactNumber" => %{"type" => ["string", "null"]},
      "sitePublishedAt" => %{"type" => ["string", "null"]},
      "siteUpdatedAt" => %{"type" => ["string", "null"]},
      "anoConstrucao" => %{
        "type" => ["integer", "null"],
        "minimum" => 1000,
        "maximum" => 9999
      },
      "link" => %{"type" => ["string", "null"]}
    }
  end

  def listing_fields_properties(catalog \\ nil) do
    catalog = catalog || ListingPreferences.default_system_options()

    listing_base_properties()
    |> Map.merge(ListingPreferences.listing_parse_schema_properties(catalog))
  end

  def listing_parse_schema(catalog \\ nil) do
    listing_object = %{
      "type" => "object",
      "properties" => listing_fields_properties(catalog),
      "required" => Map.keys(listing_fields_properties(catalog)),
      "additionalProperties" => false
    }

    %{
      "type" => "object",
      "properties" => %{
        "listings" => %{
          "type" => "array",
          "items" => listing_object
        }
      },
      "required" => ["listings"],
      "additionalProperties" => false
    }
  end

  def merge_advisor_schema do
    %{
      "type" => "object",
      "properties" => %{
        "verdict" => %{"type" => "string", "enum" => ["duplicate", "distinct"]},
        "confidence" => %{"type" => "number"},
        "suggestions" => %{
          "type" => "array",
          "items" => %{
            "type" => "object",
            "properties" => %{
              "path" => %{"type" => "string"},
              "suggestedValue" => %{"type" => ["string", "number", "boolean", "null"]},
              "note" => %{"type" => ["string", "null"]}
            },
            "required" => ["path", "suggestedValue", "note"],
            "additionalProperties" => false
          }
        }
      },
      "required" => ["verdict", "confidence", "suggestions"],
      "additionalProperties" => false
    }
  end

  def inventariante_schema do
    %{
      "type" => "object",
      "properties" => %{
        "scene" => %{"type" => "string"},
        "spaceHint" => %{"type" => "string"},
        "distinctivenessNotes" => %{"type" => ["string", "null"]},
        "layoutAnchors" => %{"type" => ["string", "null"]},
        "structure" => %{"type" => ["string", "null"]},
        "floor" => %{"type" => ["string", "null"]},
        "walls" => %{"type" => ["string", "null"]},
        "ceiling" => %{"type" => ["string", "null"]},
        "baseboard" => %{"type" => ["string", "null"]},
        "openings" => %{"type" => ["string", "null"]},
        "wetArea" => %{"type" => ["string", "null"]},
        "wetAreaFixtures" => %{"type" => ["string", "null"]},
        "materialsSpotted" => %{"type" => "array", "items" => %{"type" => "string"}},
        "inventoryLabels" => %{"type" => "array", "items" => %{"type" => "string"}}
      },
      "required" => [
        "scene",
        "spaceHint",
        "distinctivenessNotes",
        "layoutAnchors",
        "structure",
        "floor",
        "walls",
        "ceiling",
        "baseboard",
        "openings",
        "wetArea",
        "wetAreaFixtures",
        "materialsSpotted",
        "inventoryLabels"
      ],
      "additionalProperties" => false
    }
  end

  def market_summary_schema do
    %{
      "type" => "object",
      "properties" => %{"summary" => %{"type" => "string"}},
      "required" => ["summary"],
      "additionalProperties" => false
    }
  end

  def saved_link_metadata_schema do
    %{
      "type" => "object",
      "properties" => %{
        "title" => %{"type" => "string"},
        "description" => %{"type" => ["string", "null"]}
      },
      "required" => ["title", "description"],
      "additionalProperties" => false
    }
  end

  def portal_search_card_properties do
    %{
      "title" => %{"type" => ["string", "null"]},
      "neighborhood" => %{"type" => ["string", "null"]},
      "city" => %{"type" => ["string", "null"]},
      "uf" => %{"type" => ["string", "null"]},
      "propertyType" => %{"type" => ["string", "null"]},
      "bedrooms" => %{"type" => ["integer", "null"]},
      "bathrooms" => %{"type" => ["integer", "null"]},
      "parkingSpots" => %{"type" => ["integer", "null"]},
      "suites" => %{"type" => ["integer", "null"]},
      "areaTotal" => %{"type" => ["number", "null"]},
      "areaPrivate" => %{"type" => ["number", "null"]},
      "price" => %{"type" => ["number", "null"]},
      "condoFee" => %{"type" => ["number", "null"]},
      "amenities" => %{"type" => "array", "items" => %{"type" => "string"}},
      "thumbnailUrl" => %{"type" => ["string", "null"]},
      "listingUrl" => %{"type" => ["string", "null"]}
    }
  end

  def portal_search_results_schema do
    card = %{
      "type" => "object",
      "properties" => portal_search_card_properties(),
      "required" => Map.keys(portal_search_card_properties()),
      "additionalProperties" => false
    }

    %{
      "type" => "object",
      "properties" => %{
        "cards" => %{"type" => "array", "items" => card}
      },
      "required" => ["cards"],
      "additionalProperties" => false
    }
  end

  def viewing_tips_schema do
    question = %{
      "type" => "object",
      "properties" => %{
        "area" => %{"type" => "string"},
        "question" => %{"type" => "string"},
        "why" => %{"type" => "string"},
        "expectedAnswers" => %{"type" => "array", "items" => %{"type" => "string"}},
        "priority" => %{"type" => "string", "enum" => ["high", "medium", "low"]},
        "imageIndices" => %{"type" => "array", "items" => %{"type" => "integer"}}
      },
      "required" => ["area", "question", "why", "expectedAnswers", "priority", "imageIndices"],
      "additionalProperties" => false
    }

    %{
      "type" => "object",
      "properties" => %{
        "questions" => %{"type" => "array", "items" => question}
      },
      "required" => ["questions"],
      "additionalProperties" => false
    }
  end
end
