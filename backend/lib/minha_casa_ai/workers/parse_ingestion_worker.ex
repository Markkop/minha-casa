defmodule MinhaCasaAi.Workers.ParseIngestionWorker do
  use Oban.Worker,
    queue: :ai,
    max_attempts: 3,
    unique: [period: 60, fields: [:args, :worker]]

  alias MinhaCasaAi.Channel.ReplyFormatter
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

      case ListingParser.parse(strip_reply_metadata(run.input)) do
        {:ok, listings} ->
          result = %{"listings" => listings}
          Workflows.mark_ready!(run, result)
          maybe_reply_channel(run.input, result)
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

  defp maybe_reply_channel(input, result) when is_map(input) do
    case Map.get(input, "_reply") do
      %{"channel" => "whatsapp", "phone" => phone} when is_binary(phone) ->
        send_reply(WhatsAppClient, :send_text, phone, result)

      %{"channel" => "telegram", "chat_id" => chat_id} when is_binary(chat_id) ->
        send_reply(TelegramClient, :send_message, chat_id, result)

      _ ->
        :ok
    end
  end

  defp maybe_reply_channel(_, _), do: :ok

  defp send_reply(client, fun, target, result) do
    body =
      case result do
        {:error, reason} -> ReplyFormatter.error(reason)
        summary when is_map(summary) -> ReplyFormatter.workflow_summary(summary)
      end

    apply(client, fun, [target, body])
  end
end
