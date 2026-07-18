defmodule MinhaCasaAiWeb.McpController do
  use MinhaCasaAiWeb, :controller

  import Ecto.Query

  alias MinhaCasaAi.{AiUsage, Entitlements, Repo}
  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.Collection
  alias MinhaCasaAi.Listings.CollectionPolicy
  alias MinhaCasaAi.Listings.ListingData
  alias MinhaCasaAi.Workspace.SavedLinks
  alias MinhaCasaAi.Workspace.Profile
  alias MinhaCasaAiWeb.SavedLinkJSON

  @listing_data_schema %{
    type: "object",
    properties: %{
      title: %{type: ["string", "null"]},
      manualTitle: %{type: ["string", "null"]},
      address: %{type: ["string", "null"]},
      neighborhood: %{type: ["string", "null"]},
      city: %{type: ["string", "null"]},
      totalAreaM2: %{type: ["number", "null"]},
      privateAreaM2: %{type: ["number", "null"]},
      bedrooms: %{type: ["number", "null"]},
      suites: %{type: ["number", "null"]},
      bathrooms: %{type: ["number", "null"]},
      parkingSpots: %{type: ["number", "null"]},
      constructionYear: %{type: ["integer", "null"], minimum: 1000, maximum: 9999},
      price: %{type: ["number", "null"]},
      pricePerM2: %{type: ["number", "null"]},
      floor: %{type: ["number", "null"]},
      propertyType: %{type: ["string", "null"], enum: ["house", "apartment", nil]},
      stage: %{
        type: ["string", "null"],
        enum: [
          "analyzing",
          "considering",
          "scheduling_visit",
          "visit_scheduled",
          "visiting",
          "visited",
          "negotiating",
          "offer_submitted",
          "on_hold",
          "discarding",
          "discarded",
          "sold",
          nil
        ]
      },
      sourceUrl: %{type: ["string", "null"]},
      notes: %{type: ["string", "null"]},
      features: %{type: "object", additionalProperties: %{type: ["boolean", "null"]}},
      contactName: %{type: ["string", "null"]},
      contactNumber: %{type: ["string", "null"]},
      condominiumName: %{type: ["string", "null"]},
      condominiumId: %{type: ["string", "null"]},
      regionId: %{type: ["string", "null"]},
      coverImageIndex: %{type: ["integer", "null"], minimum: 0},
      imageUrl: %{type: ["string", "null"]},
      imageUrls: %{type: ["array", "null"], items: %{type: "string"}},
      imageStorageKeys: %{type: ["array", "null"], items: %{type: "string"}},
      imageFingerprints: %{type: ["array", "null"], items: %{type: "object"}},
      imageEnvironments: %{type: ["array", "null"], items: %{type: "object"}},
      imageIngestionStatus: %{
        type: ["string", "null"],
        enum: ["idle", "pending", "processing", "ready", "failed", nil]
      },
      imageIngestionError: %{type: ["string", "null"]},
      starred: %{type: ["boolean", "null"]},
      visited: %{type: ["boolean", "null"]},
      strikethrough: %{type: ["boolean", "null"]},
      discardedReason: %{type: ["string", "null"]},
      addedAt: %{type: ["string", "null"]},
      sitePublishedAt: %{type: ["string", "null"]},
      siteUpdatedAt: %{type: ["string", "null"]},
      customLat: %{type: ["number", "null"]},
      customLng: %{type: ["number", "null"]}
    },
    additionalProperties: false
  }

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
          collectionId: %{type: "string"},
          data: @listing_data_schema
        },
        required: ["collectionId", "data"]
      }
    },
    %{
      name: "save_listing",
      description: "Save a listing to the user's default or specified collection.",
      inputSchema: %{
        type: "object",
        properties: %{
          collectionId: %{type: "string"},
          data: @listing_data_schema
        },
        required: ["data"]
      }
    },
    %{
      name: "list_collections",
      description: "List collections for a user.",
      inputSchema: %{
        type: "object",
        properties: %{}
      }
    },
    %{
      name: "list_listings",
      description: "List recent listings in default collection.",
      inputSchema: %{
        type: "object",
        properties: %{
          collectionId: %{type: "string"},
          limit: %{type: "integer"}
        }
      }
    },
    %{
      name: "update_listing",
      description: "Update listing JSON fields.",
      inputSchema: %{
        type: "object",
        properties: %{
          collectionId: %{type: "string"},
          listingId: %{type: "string"},
          data: @listing_data_schema
        },
        required: ["collectionId", "listingId", "data"]
      }
    },
    %{
      name: "list_saved_links",
      description: "List saved workspace links for a user or organization profile.",
      inputSchema: %{
        type: "object",
        properties: %{}
      }
    },
    %{
      name: "create_saved_link",
      description: "Create a saved workspace link (URL required).",
      inputSchema: %{
        type: "object",
        properties: %{
          url: %{type: "string"},
          title: %{type: "string"},
          description: %{type: "string"}
        },
        required: ["url"]
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

  def handle(conn, %{
        "method" => "tools/call",
        "id" => id,
        "params" => %{"name" => name, "arguments" => args}
      }) do
    actor = %{
      user_id: conn.assigns.current_user_id,
      org_id: conn.assigns[:current_org_id],
      workspace: conn.assigns.current_workspace,
      access: conn.assigns.current_workspace_access
    }

    result = call_tool(name, args, actor)
    json(conn, %{jsonrpc: "2.0", id: id, result: result})
  end

  def handle(conn, %{"id" => id}) do
    json(conn, %{jsonrpc: "2.0", id: id, error: %{code: -32601, message: "Method not found"}})
  end

  defp call_tool("extract_listing", args, actor) do
    input =
      case args do
        %{"kind" => "url", "url" => url} -> %{"kind" => "url", "url" => url}
        %{"rawText" => raw_text} -> %{"kind" => "text", "rawText" => raw_text}
        %{"kind" => "text", "rawText" => raw_text} -> %{"kind" => "text", "rawText" => raw_text}
        _ -> %{}
      end

    entitlement = Entitlements.for_workspace(actor.workspace)

    case AiUsage.reserve(entitlement, actor.user_id, access: actor.access) do
      {:ok, %{reservation: reservation}} ->
        case ListingParser.parse(input) do
          {:ok, listings} ->
            AiUsage.consume(reservation)
            encode(%{listings: listings})

          {:error, reason} ->
            AiUsage.release(reservation, %{"reason" => inspect(reason)})
            error_result("Erro: #{reason}")
        end

      {:error, :limit_reached} ->
        error_result("Parsing indisponível neste perfil")

      {:error, _} ->
        error_result("Parsing não permitido neste perfil")
    end
  end

  defp call_tool("check_duplicates", %{"collectionId" => collection_id, "data" => data}, actor) do
    with {:ok, _collection, _access} <-
           CollectionPolicy.authorize(actor.user_id, collection_id, :view) do
      candidates = Listings.duplicate_candidates(collection_id, data)
      encode(%{duplicateCandidates: candidates})
    else
      _ -> error_result("collection not found")
    end
  end

  defp call_tool("save_listing", %{"data" => data} = args, actor) do
    user_id = actor.user_id
    org_id = actor.org_id

    collection_id =
      Map.get(args, "collectionId") ||
        default_collection(actor) || ensure_default_collection(actor).id

    with {:ok, _collection, _access} <-
           CollectionPolicy.authorize(user_id, collection_id, :add_listing),
         {:ok, listing} <-
           Listings.save_listing(collection_id, data, user_id: user_id, org_id: org_id) do
      encode(%{
        listing: %{
          id: listing.id,
          collectionId: listing.collection_id,
          data: ListingData.normalize(listing.data || %{})
        }
      })
    else
      {:error, :forbidden} -> error_result("adding listings is not allowed in this profile")
      {:error, reason} -> error_result(inspect(reason))
    end
  end

  defp call_tool("list_collections", _args, actor) do
    collections =
      list_actor_collections(actor)
      |> Enum.map(fn c -> %{id: c.id, name: c.name, isDefault: c.is_default} end)

    encode(%{collections: collections})
  end

  defp call_tool("list_listings", args, actor) do
    collection_id =
      Map.get(args, "collectionId") ||
        default_collection(actor)

    limit = Map.get(args, "limit", 10)

    if collection_id &&
         match?({:ok, _, _}, CollectionPolicy.authorize(actor.user_id, collection_id, :view)) do
      listings =
        Listings.list_listings(collection_id, limit: limit)
        |> Enum.map(fn l -> %{id: l.id, data: ListingData.normalize(l.data || %{})} end)

      encode(%{listings: listings})
    else
      encode(%{listings: []})
    end
  end

  defp call_tool(
         "update_listing",
         %{
           "collectionId" => collection_id,
           "listingId" => listing_id,
           "data" => data
         },
         actor
       ) do
    with {:ok, _collection, _access} <-
           CollectionPolicy.authorize(actor.user_id, collection_id, :edit_existing),
         {:ok, listing} <-
           Listings.update_listing(collection_id, listing_id, data,
             user_id: actor.user_id,
             org_id: actor.org_id
           ) do
      encode(%{listing: %{id: listing.id, data: ListingData.normalize(listing.data || %{})}})
    else
      {:error, reason} -> error_result(inspect(reason))
    end
  end

  defp call_tool("list_saved_links", _args, %{access: "external"}),
    do: error_result("saved links are not available in external profiles")

  defp call_tool("list_saved_links", _args, actor) do
    profile = saved_link_profile(actor)

    links =
      SavedLinks.list_links(profile)
      |> SavedLinkJSON.links()

    encode(%{links: links})
  end

  defp call_tool("create_saved_link", _args, %{access: "external"}),
    do: error_result("saved links are not available in external profiles")

  defp call_tool("create_saved_link", %{"url" => url} = args, actor) do
    profile = saved_link_profile(actor)

    title =
      case Map.get(args, "title") do
        t when is_binary(t) ->
          trimmed = String.trim(t)
          if trimmed != "", do: trimmed, else: SavedLinks.fallback_title_from_url(url)

        _ ->
          SavedLinks.fallback_title_from_url(url)
      end

    attrs = %{
      title: title,
      url: url,
      description: Map.get(args, "description")
    }

    case SavedLinks.create_link(profile, attrs) do
      {:ok, link} -> encode(%{link: SavedLinkJSON.link(link)})
      {:error, %Ecto.Changeset{} = cs} -> error_result(inspect(cs.errors))
      {:error, reason} -> error_result(inspect(reason))
    end
  end

  defp call_tool(_name, _args, _actor), do: error_result("unknown tool")

  defp saved_link_profile(actor) do
    Profile.profile_from_headers(actor.user_id, actor.org_id, actor.workspace.id)
  end

  defp list_actor_collections(actor) do
    Repo.all(
      from(c in Collection, where: c.workspace_id == ^actor.workspace.id, order_by: [asc: c.name])
    )
    |> Enum.filter(fn collection ->
      match?({:ok, _, _}, CollectionPolicy.authorize(actor.user_id, collection.id, :view))
    end)
  end

  defp default_collection(actor) do
    list_actor_collections(actor)
    |> Enum.find(& &1.is_default)
    |> case do
      nil -> list_actor_collections(actor) |> List.first() |> then(&(&1 && &1.id))
      collection -> collection.id
    end
  end

  defp ensure_default_collection(actor) do
    if actor.access == "external", do: raise("external profiles cannot create collections")
    entitlement = Entitlements.for_workspace(actor.workspace)

    with :ok <- Entitlements.ensure_collection_capacity(entitlement) do
      attrs = %{
        workspace_id: actor.workspace.id,
        created_by_user_id: actor.user_id,
        responsible_user_id: actor.user_id,
        user_id: if(actor.org_id, do: nil, else: actor.user_id),
        org_id: actor.org_id,
        name: MinhaCasaAi.Listings.Collections.default_collection_name(),
        is_default: true,
        visibility: if(actor.org_id, do: "team", else: "private")
      }

      %Collection{} |> Collection.changeset(attrs) |> Repo.insert!()
    else
      {:error, reason} -> raise "cannot create default collection: #{reason}"
    end
  end

  defp encode(map), do: %{content: [%{type: "text", text: Jason.encode!(map)}]}

  defp error_result(message),
    do: %{isError: true, content: [%{type: "text", text: message}]}
end
