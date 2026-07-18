defmodule MinhaCasaAi.Workers.ParseIngestionWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 3,
    unique: [period: 60, fields: [:args, :worker]]

  alias MinhaCasaAi.Channel.ReplyFormatter
  alias MinhaCasaAi.Chat
  alias MinhaCasaAi.Ingestion.Complete
  alias MinhaCasaAi.Integrations.ListingParser
  alias MinhaCasaAi.Telegram.Client, as: TelegramClient
  alias MinhaCasaAi.WhatsApp.Client, as: WhatsAppClient
  alias MinhaCasaAi.Workflows

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"workflow_id" => workflow_id}}) do
    run = Workflows.get_run(workflow_id)

    if is_nil(run) do
      {:cancel, "workflow not found"}
    else
      Workflows.mark_processing!(run)

      case ListingParser.parse(strip_reply_metadata(run.input), workspace_id: run.workspace_id) do
        {:ok, listings} ->
          result = %{"listings" => listings}
          Workflows.mark_ready!(run, result)
          ingestion = Complete.run(run, listings)
          maybe_log_assistant(run.input, ingestion)
          maybe_reply_channel(run.input, ingestion)
          :ok

        {:error, reason} ->
          Workflows.mark_failed!(run, RuntimeError.exception(to_string(reason)))
          maybe_reply_channel(run.input, {:error, reason})
          {:error, reason}
      end
    end
  end

  defp strip_reply_metadata(input) when is_map(input) do
    Map.drop(input, ["_reply"])
  end

  defp strip_reply_metadata(input), do: input

  defp maybe_log_assistant(input, ingestion) when is_map(input) do
    conversation_id = get_in(input, ["_reply", "conversation_id"])

    if conversation_id do
      body = ReplyFormatter.ingestion_result(ingestion)
      Chat.append_message(conversation_id, "assistant", body)
    end
  end

  defp maybe_reply_channel(input, result) when is_map(input) do
    case Map.get(input, "_reply") do
      %{"channel" => "whatsapp", "phone" => phone} when is_binary(phone) ->
        send_reply(WhatsAppClient, :send_text, phone, result)

      %{"channel" => "telegram", "chat_id" => chat_id} when is_binary(chat_id) ->
        send_telegram_reply(chat_id, result)

      _ ->
        :ok
    end
  end

  defp maybe_reply_channel(_, {:error, reason}), do: {:error, reason}
  defp maybe_reply_channel(_, _), do: :ok

  defp send_telegram_reply(chat_id, ingestion) when is_map(ingestion) do
    body = ReplyFormatter.ingestion_result(ingestion)
    markup = telegram_markup(ingestion)
    opts = if markup, do: [reply_markup: markup], else: []
    TelegramClient.send_message(chat_id, body, opts)
  end

  defp send_telegram_reply(chat_id, {:error, reason}) do
    TelegramClient.send_message(chat_id, ReplyFormatter.error(reason))
  end

  defp send_reply(client, fun, target, {:error, reason}) do
    apply(client, fun, [target, ReplyFormatter.error(reason)])
  end

  defp send_reply(client, fun, target, ingestion) when is_map(ingestion) do
    apply(client, fun, [target, ReplyFormatter.ingestion_result(ingestion)])
  end

  defp telegram_markup(%{pending_type: "duplicate_resolution"} = ingestion) do
    duplicate_keyboard(ingestion)
  end

  defp telegram_markup(%{pending_type: "multi_import"} = ingestion) do
    multi_import_keyboard(ingestion)
  end

  defp telegram_markup(_), do: nil

  @doc false
  def duplicate_keyboard(%{duplicates: [first | _], collection: %{id: collection_id}}) do
    candidate = hd(first.candidates)
    listing_id = candidate[:listingId] || candidate["listingId"]

    view_button =
      if listing_id && Complete.listing_url(collection_id, listing_id) do
        %{text: "Ver anúncio existente", url: Complete.listing_url(collection_id, listing_id)}
      else
        %{text: "Ver anúncio existente", callback_data: "dup:view:0"}
      end

    %{
      inline_keyboard: [
        [
          %{text: "Salvar mesmo assim", callback_data: "dup:save:0"},
          %{text: "Mesclar", callback_data: "dup:merge:0"}
        ],
        [
          %{text: "Ignorar", callback_data: "dup:skip:0"},
          view_button
        ]
      ]
    }
  end

  def duplicate_keyboard(_), do: nil

  defp multi_import_keyboard(%{multi_count: count}) when count > 0 do
    %{
      inline_keyboard: [
        [
          %{text: "Importar todos", callback_data: "multi:all"},
          %{text: "Cancelar", callback_data: "multi:cancel"}
        ]
      ]
    }
  end

  defp multi_import_keyboard(_), do: nil
end
