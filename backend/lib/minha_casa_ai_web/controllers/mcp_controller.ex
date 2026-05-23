defmodule MinhaCasaAiWeb.McpController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Listings

  @tools [
    %{
      name: "extract_listing",
      description: "Extract real estate listing data from text or URL.",
      inputSchema: %{
        type: "object",
        properties: %{
          kind: %{type: "string", enum: ["text", "url"]},
          rawText: %{type: "string"},
          url: %{type: "string"}
        },
        required: ["kind"]
      }
    },
    %{
      name: "check_duplicates",
      description: "Check duplicate listings in a collection before save.",
      inputSchema: %{
        type: "object",
        properties: %{
          userId: %{type: "string"},
          collectionId: %{type: "string"},
          data: %{type: "object"}
        },
        required: ["userId", "collectionId", "data"]
      }
    },
    %{
      name: "save_listing",
      description: "Save a listing to the user's default or specified collection.",
      inputSchema: %{
        type: "object",
        properties: %{
          userId: %{type: "string"},
          collectionId: %{type: "string"},
          data: %{type: "object"}
        },
        required: ["userId", "data"]
      }
    },
    %{
      name: "list_collections",
      description: "List collections for a user.",
      inputSchema: %{
        type: "object",
        properties: %{userId: %{type: "string"}},
        required: ["userId"]
      }
    },
    %{
      name: "list_listings",
      description: "List recent listings in default collection.",
      inputSchema: %{
        type: "object",
        properties: %{
          userId: %{type: "string"},
          collectionId: %{type: "string"},
          limit: %{type: "integer"}
        },
        required: ["userId"]
      }
    },
    %{
      name: "update_listing",
      description: "Update listing JSON fields.",
      inputSchema: %{
        type: "object",
        properties: %{
          userId: %{type: "string"},
          collectionId: %{type: "string"},
          listingId: %{type: "string"},
          data: %{type: "object"}
        },
        required: ["userId", "collectionId", "listingId", "data"]
      }
    }
  ]

  def handle(conn, %{"method" => "initialize", "id" => id}) do
    json(conn, %{
      jsonrpc: "2.0",
      id: id,
      result: %{
        protocolVersion: "2025-03-26",
        serverInfo: %{name: "minha-casa-ai", version: "0.2.0"},
        capabilities: %{tools: %{}}
      }
    })
  end

  def handle(conn, %{"method" => "tools/list", "id" => id}) do
    json(conn, %{jsonrpc: "2.0", id: id, result: %{tools: @tools}})
  end

  def handle(conn, %{"method" => "tools/call", "id" => id, "params" => %{"name" => name, "arguments" => args}}) do
    result = call_tool(name, args)
    json(conn, %{jsonrpc: "2.0", id: id, result: result})
  end

  def handle(conn, %{"id" => id}) do
    json(conn, %{jsonrpc: "2.0", id: id, error: %{code: -32601, message: "Method not found"}})
  end

  defp call_tool("extract_listing", args) do
    input =
      case args do
        %{"kind" => "url", "url" => url} -> %{"kind" => "url", "url" => url}
        %{"rawText" => raw_text} -> %{"kind" => "text", "rawText" => raw_text}
        %{"kind" => "text", "rawText" => raw_text} -> %{"kind" => "text", "rawText" => raw_text}
        _ -> %{}
      end

    case ListingParser.parse(input) do
      {:ok, listings} ->
        %{content: [%{type: "text", text: Jason.encode!(%{listings: listings})}]}

      {:error, reason} ->
        %{isError: true, content: [%{type: "text", text: "Erro: #{reason}"}]}
    end
  end

  defp call_tool("check_duplicates", %{"userId" => user_id, "collectionId" => collection_id, "data" => data}) do
    with {:ok, _} <- Listings.get_collection(collection_id, user_id, nil) do
      candidates = Listings.duplicate_candidates(collection_id, data)
      encode(%{duplicateCandidates: candidates})
    else
      _ -> error_result("collection not found")
    end
  end

  defp call_tool("save_listing", %{"userId" => user_id, "data" => data} = args) do
    collection_id =
      Map.get(args, "collectionId") ||
        Listings.get_default_collection_id(user_id, nil) ||
        Listings.ensure_default_collection!(user_id, nil).id

    case Listings.save_listing(collection_id, data, user_id: user_id) do
      {:ok, listing} -> encode(%{listing: %{id: listing.id, collectionId: listing.collection_id, data: listing.data}})
      {:error, reason} -> error_result(inspect(reason))
    end
  end

  defp call_tool("list_collections", %{"userId" => user_id}) do
    collections =
      Listings.list_collections(user_id, nil)
      |> Enum.map(fn c -> %{id: c.id, name: c.name, isDefault: c.is_default} end)

    encode(%{collections: collections})
  end

  defp call_tool("list_listings", %{"userId" => user_id} = args) do
    collection_id =
      Map.get(args, "collectionId") ||
        Listings.get_default_collection_id(user_id, nil)

    limit = Map.get(args, "limit", 10)

    if collection_id do
      listings =
        Listings.list_listings(collection_id, limit: limit)
        |> Enum.map(fn l -> %{id: l.id, data: l.data} end)

      encode(%{listings: listings})
    else
      encode(%{listings: []})
    end
  end

  defp call_tool("update_listing", %{
         "userId" => user_id,
         "collectionId" => collection_id,
         "listingId" => listing_id,
         "data" => data
       }) do
    case Listings.update_listing(collection_id, listing_id, data, user_id: user_id) do
      {:ok, listing} -> encode(%{listing: %{id: listing.id, data: listing.data}})
      {:error, reason} -> error_result(inspect(reason))
    end
  end

  defp call_tool(_name, _args), do: error_result("unknown tool")

  defp encode(map), do: %{content: [%{type: "text", text: Jason.encode!(map)}]}

  defp error_result(message),
    do: %{isError: true, content: [%{type: "text", text: message}]}
end
