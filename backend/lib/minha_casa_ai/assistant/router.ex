defmodule MinhaCasaAi.Assistant.Router do
  @moduledoc """
  Entry point for linked channel users: pending flows, commands, ingest, optional LLM.
  """

  alias MinhaCasaAi.Assistant.{Intent, LLM, PendingHandler, Tools}
  alias MinhaCasaAi.Channel.Agent
  alias MinhaCasaAi.Chat
  alias MinhaCasaAi.Chat.Pending
  alias MinhaCasaAi.Telegram.Client, as: TelegramClient
  alias MinhaCasaAi.WhatsApp.Client, as: WhatsAppClient

  def handle("telegram", inbound, user_id) do
    metadata = %{"chat_id" => inbound.chat_id}
    handle_channel("telegram", inbound, user_id, metadata)
  end

  def handle("whatsapp", inbound, user_id) do
    metadata = %{"wa_id" => inbound.wa_id}
    handle_channel("whatsapp", inbound, user_id, metadata)
  end

  defp handle_channel(_channel, _inbound, nil, _metadata), do: {:error, :not_linked}

  defp handle_channel(channel, inbound, user_id, metadata) when is_binary(user_id) do
    conversation = Chat.ensure_channel_conversation!(channel, user_id, metadata)
    conversation_id = conversation.id
    ctx = %{conversation_id: conversation_id, user_id: user_id, channel: channel}

    result =
      if Pending.active?(conversation_id) do
        PendingHandler.handle(channel, inbound, user_id, conversation_id)
      else
        route_intent(channel, inbound, user_id, ctx)
      end

    deliver_reply(channel, inbound, result)
  end

  defp route_intent(channel, inbound, user_id, ctx) do
    case Intent.classify(inbound) do
      {:callback, _} ->
        {:ok, "Use os botões ou responda com 1, 2 ou 3."}

      {:ingest, ingest_inbound} ->
        dispatch_ingest(channel, ingest_inbound, user_id)

      {:command, command} ->
        Tools.run(user_id, command, ctx)

      {:llm, text} ->
        LLM.run(user_id, text, ctx)

      :unknown ->
        Tools.run(user_id, :help, ctx)
    end
  end

  defp dispatch_ingest("telegram", inbound, _user_id) do
    Agent.handle_telegram(inbound)
    :ingest_started
  end

  defp dispatch_ingest("whatsapp", inbound, _user_id) do
    Agent.handle_whatsapp(inbound)
    :ingest_started
  end

  defp deliver_reply(_channel, _inbound, :ingest_started), do: :ok

  defp deliver_reply(channel, inbound, {:ok, text}) when is_binary(text) do
    send_text(channel, inbound, text, nil)
  end

  defp deliver_reply(channel, inbound, {:ok, text, reply_markup}) when is_binary(text) do
    send_text(channel, inbound, text, reply_markup)
  end

  defp deliver_reply(channel, inbound, {:error, reason}) do
    send_text(channel, inbound, MinhaCasaAi.Channel.ReplyFormatter.error(reason), nil)
  end

  defp send_text("telegram", %{chat_id: chat_id}, text, reply_markup) do
    opts = if reply_markup, do: [reply_markup: reply_markup], else: []
    TelegramClient.send_message(chat_id, text, opts)
  end

  defp send_text("whatsapp", %{phone: phone}, text, _reply_markup) do
    WhatsAppClient.send_text(phone, text)
  end
end
