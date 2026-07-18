defmodule MinhaCasaAi.Ingestion.Complete do
  @moduledoc """
  Post-parse orchestration: default collection, duplicate checks, auto-save, pending state.
  """

  alias MinhaCasaAi.Chat.Pending
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.ListingShortLinks
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.Collection
  alias MinhaCasaAi.Workflows.WorkflowRun

  @type result :: %{
          saved: [saved_listing()],
          duplicates: [duplicate_item()],
          pending_type: String.t() | nil,
          collection: %Collection{} | nil,
          workflow_id: String.t() | nil
        }

  @type saved_listing :: %{
          listing_id: String.t(),
          collection_id: String.t(),
          title: String.t(),
          url: String.t() | nil
        }

  @type duplicate_item :: %{
          index: non_neg_integer(),
          listing_data: map(),
          candidates: [map()]
        }

  def run(%WorkflowRun{} = run, listings) when is_list(listings) do
    user_id = run.user_id

    if is_nil(user_id) do
      %{saved: [], duplicates: [], pending_type: nil, collection: nil, workflow_id: run.id}
    else
      collection = Listings.ensure_default_collection!(user_id, nil)
      conversation_id = get_conversation_id(run.input)

      cond do
        length(listings) > 1 ->
          handle_multi(run, listings, collection, conversation_id)

        length(listings) == 1 ->
          handle_single(run, hd(listings), collection, conversation_id, 0)

        true ->
          %{
            saved: [],
            duplicates: [],
            pending_type: nil,
            collection: collection,
            workflow_id: run.id
          }
      end
    end
  end

  defp handle_single(run, listing_data, collection, conversation_id, index) do
    opts = [user_id: run.user_id, org_id: nil]
    candidates = Listings.duplicate_candidates(collection.id, listing_data)

    if candidates == [] do
      case Listings.save_listing(collection.id, listing_data, opts) do
        {:ok, saved} ->
          maybe_set_last_listing(conversation_id, saved.id)

          %{
            saved: [saved_entry(saved, collection, listing_data)],
            duplicates: [],
            pending_type: nil,
            collection: collection,
            workflow_id: run.id
          }

        {:error, _} ->
          %{
            saved: [],
            duplicates: [],
            pending_type: nil,
            collection: collection,
            workflow_id: run.id
          }
      end
    else
      set_duplicate_pending!(conversation_id, run, collection, [
        %{index: index, listing_data: listing_data, candidates: candidates}
      ])

      %{
        saved: [],
        duplicates: [
          %{index: index, listing_data: listing_data, candidates: candidates}
        ],
        pending_type: "duplicate_resolution",
        collection: collection,
        workflow_id: run.id
      }
    end
  end

  defp handle_multi(run, listings, collection, conversation_id) do
    set_multi_pending!(conversation_id, run, collection, listings)

    %{
      saved: [],
      duplicates: [],
      pending_type: "multi_import",
      collection: collection,
      workflow_id: run.id,
      multi_count: length(listings),
      multi_previews: Enum.with_index(listings, 1)
    }
  end

  defp set_duplicate_pending!(conversation_id, run, collection, duplicates)
       when is_binary(conversation_id) do
    items =
      Enum.map(duplicates, fn d ->
        %{
          "index" => d.index,
          "listing_data" => d.listing_data,
          "candidates" => encode_candidates(d.candidates)
        }
      end)

    Pending.set!(conversation_id, %{
      "type" => "duplicate_resolution",
      "workflow_id" => run.id,
      "collection_id" => collection.id,
      "items" => items,
      "current_index" => 0
    })
  end

  defp set_duplicate_pending!(_, _, _, _), do: :ok

  defp set_multi_pending!(conversation_id, run, collection, listings)
       when is_binary(conversation_id) do
    items =
      Enum.with_index(listings)
      |> Enum.map(fn {data, index} ->
        %{"index" => index, "listing_data" => data, "selected" => true}
      end)

    Pending.set!(conversation_id, %{
      "type" => "multi_import",
      "workflow_id" => run.id,
      "collection_id" => collection.id,
      "items" => items
    })
  end

  defp set_multi_pending!(_, _, _, _), do: :ok

  defp encode_candidates(candidates) do
    Enum.map(candidates, fn c ->
      %{
        "listingId" => c[:listingId] || c["listingId"],
        "score" => c[:score] || c["score"],
        "reason" => c[:reason] || c["reason"]
      }
    end)
  end

  defp saved_entry(%{id: id}, collection, listing_data) do
    %{
      listing_id: id,
      collection_id: collection.id,
      title: Map.get(listing_data, "title") || "Sem título",
      listing_data: listing_data,
      url: ListingShortLinks.short_url(collection.id, id)
    }
  end

  def listing_url(collection_id, listing_id) do
    ListingShortLinks.short_url(collection_id, listing_id) ||
      app_listing_url(collection_id, listing_id)
  end

  def app_listing_url(_collection_id, listing_id) do
    base = Config.app_public_url() || ""

    if base == "" do
      nil
    else
      base
      |> String.trim_trailing("/")
      |> Kernel.<>("/imoveis/#{listing_id}")
    end
  end

  defp get_conversation_id(input) when is_map(input) do
    get_in(input, ["_reply", "conversation_id"])
  end

  defp get_conversation_id(_), do: nil

  defp maybe_set_last_listing(conversation_id, listing_id)
       when is_binary(conversation_id) and is_binary(listing_id) do
    Pending.set_last_listing_id!(conversation_id, listing_id)
  end

  defp maybe_set_last_listing(_, _), do: :ok
end
