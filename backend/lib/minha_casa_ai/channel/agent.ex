defmodule MinhaCasaAi.Channel.Agent do
  @moduledoc """
  Shared inbound message orchestration for WhatsApp, Telegram, and future web chat.
  """

  alias MinhaCasaAi.Channel.{ContentDetector, ReplyFormatter}
  alias MinhaCasaAi.Chat
  alias MinhaCasaAi.Telegram.Client, as: TelegramClient
  alias MinhaCasaAi.Telegram.Identities, as: TelegramIdentities
  alias MinhaCasaAi.WhatsApp.Client, as: WhatsAppClient
  alias MinhaCasaAi.WhatsApp.Identities, as: WhatsAppIdentities

  def handle_whatsapp(%{wa_id: wa_id, phone: phone} = inbound) do
    user_id =
      case WhatsAppIdentities.get_by_wa_id(wa_id) do
        %{user_id: id} -> id
        _ -> nil
      end

    if is_nil(user_id) do
      {:error, :not_linked}
    else
      org_id = WhatsAppIdentities.default_org_id(user_id)

      with {:ok, parser_input} <- ContentDetector.from_whatsapp_message(inbound),
           :ok <- WhatsAppClient.send_text(phone, "Analisando sua mensagem…"),
           {:ok, %{workflow: workflow}} <-
             start_chat_workflow(user_id, org_id, "whatsapp", inbound, parser_input) do
        {:ok, workflow}
      else
        {:error, reason} ->
          WhatsAppClient.send_text(phone, ReplyFormatter.error(reason))
          {:error, reason}
      end
    end
  end

  def handle_telegram(%{chat_id: chat_id} = inbound) do
    user_id =
      case TelegramIdentities.get_by_chat_id(chat_id) do
        %{user_id: id} -> id
        _ -> nil
      end

    if is_nil(user_id) do
      {:error, :not_linked}
    else
      org_id = TelegramIdentities.default_org_id(user_id)

      with {:ok, parser_input} <- ContentDetector.from_telegram_message(inbound),
           :ok <- TelegramClient.send_message(chat_id, "Analisando sua mensagem…"),
           {:ok, %{workflow: workflow}} <-
             start_chat_workflow(user_id, org_id, "telegram", inbound, parser_input) do
        {:ok, workflow}
      else
        {:error, reason} ->
          TelegramClient.send_message(chat_id, ReplyFormatter.error(reason))
          {:error, reason}
      end
    end
  end

  defp start_chat_workflow(user_id, org_id, channel, inbound, parser_input) do
    reply_meta =
      case channel do
        "whatsapp" ->
          %{
            "channel" => "whatsapp",
            "wa_id" => inbound.wa_id,
            "phone" => inbound.phone
          }

        "telegram" ->
          %{
            "channel" => "telegram",
            "chat_id" => inbound.chat_id
          }
      end

    input = Map.put(parser_input, "_reply", reply_meta)

    content =
      case parser_input do
        %{"rawText" => text} -> text
        %{"url" => url} -> url
        _ -> "media"
      end

    metadata =
      case channel do
        "whatsapp" ->
          %{
            "wa_id" => inbound.wa_id,
            "wa_message_id" => inbound.message_id,
            "parser_input" => input
          }

        "telegram" ->
          %{
            "chat_id" => inbound.chat_id,
            "telegram_message_id" => inbound.message_id,
            "parser_input" => input
          }
      end

    case Chat.create_message(%{
           channel: channel,
           user_id: user_id,
           org_id: org_id,
           content: content,
           metadata: metadata
         }) do
      {:ok, %{workflow: %{id: _} = workflow}} ->
        {:ok, %{workflow: workflow}}

      {:ok, _} ->
        {:error, :workflow_failed}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
