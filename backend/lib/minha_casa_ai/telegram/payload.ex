defmodule MinhaCasaAi.Telegram.Payload do
  @moduledoc """
  Extracts inbound private-chat messages from Telegram Bot API updates.
  """

  def extract_inbound(%{"callback_query" => query}) when is_map(query) do
    case normalize_callback(query) do
      nil -> []
      inbound -> [inbound]
    end
  end

  def extract_inbound(%{"message" => message}) when is_map(message) do
    case normalize_message(message) do
      nil -> []
      inbound -> [inbound]
    end
  end

  def extract_inbound(_), do: []

  def extract_messages(payload) do
    extract_inbound(payload)
    |> Enum.filter(fn item -> item.type != "callback" end)
  end

  def extract_callbacks(payload) do
    extract_inbound(payload)
    |> Enum.filter(fn item -> item.type == "callback" end)
  end

  defp normalize_message(%{"chat" => %{"id" => chat_id, "type" => "private"}} = message) do
    from = Map.get(message, "from", %{})

    %{
      chat_id: to_string(chat_id),
      telegram_user_id: Map.get(from, "id") && to_string(from["id"]),
      message_id: Map.get(message, "message_id"),
      type: message_type(message),
      text: Map.get(message, "text"),
      message: message,
      callback_query_id: nil,
      callback_data: nil
    }
  end

  defp normalize_message(_), do: nil

  defp normalize_callback(%{
         "id" => callback_id,
         "data" => data,
         "message" => %{"chat" => %{"id" => chat_id, "type" => "private"}}
       }) do
    %{
      chat_id: to_string(chat_id),
      telegram_user_id: nil,
      message_id: nil,
      type: "callback",
      callback_query_id: to_string(callback_id),
      callback_data: to_string(data),
      text: nil,
      message: nil
    }
  end

  defp normalize_callback(_), do: nil

  defp message_type(%{"text" => _}), do: "text"
  defp message_type(%{"photo" => _}), do: "photo"
  defp message_type(%{"document" => _}), do: "document"
  defp message_type(%{"voice" => _}), do: "voice"
  defp message_type(%{"audio" => _}), do: "audio"
  defp message_type(_), do: "unknown"
end
