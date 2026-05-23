defmodule MinhaCasaAi.Telegram.Payload do
  @moduledoc """
  Extracts inbound private-chat messages from Telegram Bot API updates.
  """

  def extract_messages(%{"message" => message}) when is_map(message) do
    case normalize_message(message) do
      nil -> []
      inbound -> [inbound]
    end
  end

  def extract_messages(_), do: []

  defp normalize_message(%{"chat" => %{"id" => chat_id, "type" => "private"}} = message) do
    from = Map.get(message, "from", %{})

    %{
      chat_id: to_string(chat_id),
      telegram_user_id: Map.get(from, "id") && to_string(from["id"]),
      message_id: Map.get(message, "message_id"),
      type: message_type(message),
      message: message
    }
  end

  defp normalize_message(_), do: nil

  defp message_type(%{"text" => _}), do: "text"
  defp message_type(%{"photo" => _}), do: "photo"
  defp message_type(%{"document" => _}), do: "document"
  defp message_type(%{"voice" => _}), do: "voice"
  defp message_type(%{"audio" => _}), do: "audio"
  defp message_type(_), do: "unknown"
end
