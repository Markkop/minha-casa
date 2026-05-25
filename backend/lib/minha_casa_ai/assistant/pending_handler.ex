defmodule MinhaCasaAi.Assistant.PendingHandler do
  @moduledoc """
  Handles in-chat pending flows: duplicates, multi-import, callbacks.
  """

  alias MinhaCasaAi.Assistant.PendingChoices
  alias MinhaCasaAi.Channel.{Inbound, ReplyFormatter}
  alias MinhaCasaAi.Chat.{Conversation, Pending}
  alias MinhaCasaAi.Ingestion.Complete
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Telegram.Client, as: TelegramClient

  def handle(channel, inbound, user_id, conversation_id) do
    pending = Pending.get(conversation_id)

    if is_nil(pending) do
      {:error, :no_pending}
    else
      dispatch(channel, inbound, user_id, conversation_id, pending)
    end
  end

  defp dispatch(channel, %{type: "callback", callback_data: data} = inbound, user_id, conversation_id, pending) do
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

  defp handle_callback(_channel, "multi:all", user_id, conversation_id, %{"type" => "multi_import"} = pending, _inbound) do
    import_multi_items(user_id, conversation_id, pending, :all)
  end

  defp handle_callback(_channel, "multi:cancel", _user_id, conversation_id, _pending, _inbound) do
    Pending.clear!(conversation_id)
    {:ok, "Importação cancelada."}
  end

  defp handle_callback(_channel, "dup:save:" <> index, user_id, conversation_id, pending, _inbound) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :save)
  end

  defp handle_callback(_channel, "dup:skip:" <> index, user_id, conversation_id, pending, _inbound) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :skip)
  end

  defp handle_callback(_channel, "dup:view:" <> index, user_id, conversation_id, pending, _inbound) do
    resolve_duplicate(user_id, conversation_id, pending, String.to_integer(index), :view)
  end

  defp handle_callback(_channel, _data, _user_id, _conversation_id, _pending, _inbound) do
    {:ok, ReplyFormatter.error(:invalid_pending_reply)}
  end

  defp handle_text(channel, text, user_id, conversation_id, %{"type" => "duplicate_resolution"} = pending) do
    case PendingChoices.duplicate_action(text) do
      :cancel ->
        Pending.clear!(conversation_id)
        {:ok, "Ação cancelada."}

      action when action in [:save, :skip, :view] ->
        index = Map.get(pending, "current_index", 0)
        resolve_duplicate(user_id, conversation_id, pending, index, action)

      _ ->
        {:ok, ReplyFormatter.error(:invalid_pending_reply), duplicate_markup(channel, pending)}
    end
  end

  defp handle_text(_channel, text, user_id, conversation_id, %{"type" => "multi_import"} = pending) do
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

  defp resolve_duplicate(user_id, conversation_id, pending, index, :view) do
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

    advance_duplicate(user_id, conversation_id, pending, index, saved)
  end

  defp advance_duplicate(_user_id, conversation_id, pending, index, saved_url) do
    items = Map.get(pending, "items", [])
    remaining = Enum.drop(items, index + 1)

    msg =
      if saved_url do
        "Salvo! #{saved_url}"
      else
        "Ok, ignorado."
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

      next_msg = msg <> "\n\n" <> ReplyFormatter.ingestion_result(%{
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

    saved =
      items
      |> Enum.filter(fn item -> (item["index"] + 1) in indices end)
      |> Enum.reduce([], fn item, acc ->
        case Listings.save_listing(collection_id, item["listing_data"], user_id: user_id) do
          {:ok, listing} -> acc ++ [listing]
          _ -> acc
        end
      end)

    Pending.clear!(conversation_id)

    if saved == [] do
      {:ok, "Nenhum imóvel importado."}
    else
      last = List.last(saved)
      Pending.set_last_listing_id!(conversation_id, last.id)

      titles =
        Enum.map(saved, fn l ->
          title = get_in(l.data, ["titulo"]) || "Imóvel"
          "• #{title}"
        end)

      {:ok, "Importei #{length(saved)} imóvel(is):\n\n#{Enum.join(titles, "\n")}"}
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

  defp duplicate_markup("telegram", pending) do
    %{inline_keyboard: [[%{text: "Salvar", callback_data: "dup:save:0"}, %{text: "Ignorar", callback_data: "dup:skip:0"}]]}
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
end
