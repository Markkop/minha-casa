defmodule MinhaCasaAi.Assistant.PendingHandler do
  @moduledoc """
  Handles in-chat pending flows: duplicates, multi-import, callbacks.
  """

  alias MinhaCasaAi.Assistant.PendingChoices
  alias MinhaCasaAi.Channel.{Inbound, ReplyFormatter}
  alias MinhaCasaAi.Chat.Pending
  alias MinhaCasaAi.Ingestion.Complete
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.MergeSessions
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Telegram.Client, as: TelegramClient

  def handle(channel, inbound, user_id, conversation_id) do
    pending = Pending.get(conversation_id)

    if is_nil(pending) do
      {:error, :no_pending}
    else
      dispatch(channel, inbound, user_id, conversation_id, pending)
    end
  end

  defp dispatch(
         channel,
         %{type: "callback", callback_data: data} = inbound,
         user_id,
         conversation_id,
         pending
       ) do
    if channel == "telegram" do
      TelegramClient.answer_callback_query(inbound.callback_query_id)
    end

    handle_callback(channel, data, user_id, conversation_id, pending, inbound)
  end

  defp dispatch(channel, inbound, user_id, conversation_id, pending) do
    case Inbound.text(inbound) do
      text when is_binary(text) ->
        handle_text(channel, text, user_id, conversation_id, pending)

      _ ->
        {:ok, ReplyFormatter.error(:invalid_pending_reply)}
    end
  end

  defp handle_callback(
         _channel,
         "multi:all",
         user_id,
         conversation_id,
         %{"type" => "multi_import"} = pending,
         _inbound
       ) do
    import_multi_items(user_id, conversation_id, pending, :all)
  end

  defp handle_callback(_channel, "multi:cancel", _user_id, conversation_id, _pending, _inbound) do
    Pending.clear!(conversation_id)
    {:ok, "Importação cancelada."}
  end

  defp handle_callback(
         _channel,
         "dup:save:" <> index,
         user_id,
         conversation_id,
         pending,
         _inbound
       ) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :save)
  end

  defp handle_callback(
         _channel,
         "dup:skip:" <> index,
         user_id,
         conversation_id,
         pending,
         _inbound
       ) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :skip)
  end

  defp handle_callback(
         _channel,
         "dup:merge:" <> index,
         user_id,
         conversation_id,
         pending,
         _inbound
       ) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :merge)
  end

  defp handle_callback(
         _channel,
         "dup:view:" <> index,
         user_id,
         conversation_id,
         pending,
         _inbound
       ) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :view)
  end

  defp handle_callback(_channel, _data, _user_id, _conversation_id, _pending, _inbound) do
    {:ok, ReplyFormatter.error(:invalid_pending_reply)}
  end

  defp handle_text(
         channel,
         text,
         user_id,
         conversation_id,
         %{"type" => "duplicate_resolution"} = pending
       ) do
    case PendingChoices.duplicate_action(text) do
      :cancel ->
        Pending.clear!(conversation_id)
        {:ok, "Ação cancelada."}

      action when action in [:save, :merge, :skip, :view] ->
        index = Map.get(pending, "current_index", 0)
        resolve_duplicate(user_id, conversation_id, pending, index, action)

      _ ->
        {:ok, ReplyFormatter.error(:invalid_pending_reply), duplicate_markup(channel, pending)}
    end
  end

  defp handle_text(
         _channel,
         text,
         user_id,
         conversation_id,
         %{"type" => "multi_import"} = pending
       ) do
    cond do
      PendingChoices.cancelled?(text) ->
        Pending.clear!(conversation_id)
        {:ok, "Importação cancelada."}

      String.downcase(text) in ["todos", "all"] ->
        import_multi_items(user_id, conversation_id, pending, :all)

      true ->
        indices = parse_indices(text)

        if indices == [] do
          {:ok, "Informe os números (ex.: 1,3) ou diga \"todos\"."}
        else
          import_multi_items(user_id, conversation_id, pending, {:indices, indices})
        end
    end
  end

  defp handle_text(_channel, _text, _user_id, conversation_id, _pending) do
    Pending.clear!(conversation_id)
    {:error, :pending_expired}
  end

  defp resolve_duplicate(_user_id, _conversation_id, pending, index, :view) do
    items = Map.get(pending, "items", [])
    item = Enum.at(items, index)

    if item do
      candidate = get_in(item, ["candidates", Access.at(0)])
      listing_id = candidate && (candidate["listingId"] || candidate[:listingId])
      collection_id = pending["collection_id"]
      url = if listing_id, do: Complete.listing_url(collection_id, listing_id), else: nil

      if url do
        {:ok, "Abra no site: #{url}"}
      else
        {:ok, "Não encontrei o link do imóvel existente."}
      end
    else
      {:ok, ReplyFormatter.error(:invalid_pending_reply)}
    end
  end

  defp resolve_duplicate(user_id, conversation_id, pending, index, :skip) do
    advance_duplicate(user_id, conversation_id, pending, index, nil)
  end

  defp resolve_duplicate(user_id, conversation_id, pending, index, :merge) do
    items = Map.get(pending, "items", [])
    item = Enum.at(items, index)
    collection_id = pending["collection_id"]
    listing_data = item && item["listing_data"]
    candidate = item && get_in(item, ["candidates", Access.at(0)])
    target_id = candidate && (candidate["listingId"] || candidate[:listingId])

    result =
      with data when is_map(data) <- listing_data,
           {:ok, session} <-
             MergeSessions.create(collection_id, data,
               user_id: user_id,
               target_listing_id: target_id
             ),
           url when is_binary(url) <- merge_review_url(session.id) do
        {:message, "Revise a mesclagem no site: #{url}"}
      else
        _ -> {:message, "Não foi possível preparar a mesclagem. Tente novamente no site."}
      end

    advance_duplicate(user_id, conversation_id, pending, index, result)
  end

  defp resolve_duplicate(user_id, conversation_id, pending, index, :save) do
    items = Map.get(pending, "items", [])
    item = Enum.at(items, index)
    collection_id = pending["collection_id"]
    listing_data = item && item["listing_data"]

    saved =
      if listing_data do
        case Listings.save_listing(collection_id, listing_data, user_id: user_id) do
          {:ok, listing} ->
            Pending.set_last_listing_id!(conversation_id, listing.id)
            Complete.listing_url(collection_id, listing.id)

          _ ->
            nil
        end
      end

    advance_duplicate(
      user_id,
      conversation_id,
      pending,
      index,
      if(saved, do: {:saved, saved}, else: nil)
    )
  end

  defp advance_duplicate(_user_id, conversation_id, pending, index, result) do
    items = Map.get(pending, "items", [])
    remaining = Enum.drop(items, index + 1)

    msg =
      case result do
        {:saved, saved_url} -> "Salvo! #{saved_url}"
        {:message, message} -> message
        _ -> "Ok, ignorado."
      end

    if remaining == [] do
      Pending.clear!(conversation_id)
      {:ok, msg}
    else
      Pending.set!(conversation_id, %{
        pending
        | "items" => remaining,
          "current_index" => 0
      })

      next_msg =
        msg <>
          "\n\n" <>
          ReplyFormatter.ingestion_result(%{
            pending_type: "duplicate_resolution",
            duplicates: [
              %{
                listing_data: hd(remaining)["listing_data"],
                candidates: hd(remaining)["candidates"]
              }
            ],
            collection: %{name: collection_name(pending)}
          })

      {:ok, next_msg, duplicate_markup("telegram", put_remaining_pending(pending, remaining))}
    end
  end

  defp import_multi_items(user_id, conversation_id, pending, :all) do
    indices =
      pending
      |> Map.get("items", [])
      |> Enum.map(fn item -> item["index"] + 1 end)

    import_multi_items(user_id, conversation_id, pending, {:indices, indices})
  end

  defp import_multi_items(user_id, conversation_id, pending, {:indices, indices}) do
    collection_id = pending["collection_id"]
    items = Map.get(pending, "items", [])

    {saved, duplicates} =
      items
      |> Enum.filter(fn item -> (item["index"] + 1) in indices end)
      |> Enum.reduce({[], []}, fn item, {saved, duplicates} ->
        candidates = Listings.duplicate_candidates(collection_id, item["listing_data"])

        if candidates == [] do
          case Listings.save_listing(collection_id, item["listing_data"], user_id: user_id) do
            {:ok, listing} -> {saved ++ [listing], duplicates}
            _ -> {saved, duplicates}
          end
        else
          duplicate = %{
            "index" => item["index"],
            "listing_data" => item["listing_data"],
            "candidates" =>
              Enum.map(candidates, fn candidate ->
                %{
                  "listingId" => candidate[:listingId] || candidate["listingId"],
                  "score" => candidate[:score] || candidate["score"],
                  "reason" => candidate[:reason] || candidate["reason"]
                }
              end)
          }

          {saved, duplicates ++ [duplicate]}
        end
      end)

    if duplicates == [] do
      Pending.clear!(conversation_id)
    else
      Pending.set!(conversation_id, %{
        "type" => "duplicate_resolution",
        "workflow_id" => pending["workflow_id"],
        "collection_id" => collection_id,
        "items" => duplicates,
        "current_index" => 0
      })
    end

    cond do
      saved == [] and duplicates == [] ->
        {:ok, "Nenhum imóvel importado."}

      duplicates == [] ->
        last = List.last(saved)
        Pending.set_last_listing_id!(conversation_id, last.id)

        titles =
          Enum.map(saved, fn l ->
            title =
              l.data |> MinhaCasaAi.Listings.ListingData.normalize() |> Map.get("title") ||
                "Imóvel"

            "• #{title}"
          end)

        {:ok, "Importei #{length(saved)} imóvel(is):\n\n#{Enum.join(titles, "\n")}"}

      true ->
        if saved != [] do
          Pending.set_last_listing_id!(conversation_id, List.last(saved).id)
        end

        first = hd(duplicates)
        prefix = if saved == [], do: "", else: "Importei #{length(saved)} imóvel(is).\n\n"

        duplicate_text =
          ReplyFormatter.ingestion_result(%{
            pending_type: "duplicate_resolution",
            duplicates: [
              %{listing_data: first["listing_data"], candidates: first["candidates"]}
            ],
            collection: %{name: collection_name(pending)}
          })

        {:ok, prefix <> duplicate_text, duplicate_markup("telegram", pending)}
    end
  end

  defp parse_indices(text) do
    text
    |> String.split(~r/[\s,;]+/, trim: true)
    |> Enum.map(fn part ->
      case Integer.parse(part) do
        {n, _} when n > 0 -> n
        _ -> nil
      end
    end)
    |> Enum.reject(&is_nil/1)
  end

  defp duplicate_markup("telegram", _pending) do
    %{
      inline_keyboard: [
        [
          %{text: "Salvar mesmo assim", callback_data: "dup:save:0"},
          %{text: "Mesclar", callback_data: "dup:merge:0"}
        ],
        [%{text: "Ignorar", callback_data: "dup:skip:0"}]
      ]
    }
  end

  defp duplicate_markup(_, _), do: nil

  defp put_remaining_pending(pending, remaining) do
    Map.put(pending, "items", remaining)
  end

  defp collection_name(%{"collection_id" => id}) do
    case Listings.get_collection(id, nil, nil) do
      {:ok, c} -> c.name
      _ -> "coleção"
    end
  end

  defp collection_name(_), do: "coleção"

  defp merge_review_url(session_id) do
    case Config.app_public_url() do
      base when is_binary(base) and base != "" ->
        String.trim_trailing(base, "/") <> "/lista?merge=#{session_id}"

      _ ->
        nil
    end
  end
end
