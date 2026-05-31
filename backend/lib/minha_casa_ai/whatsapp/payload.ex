defmodule MinhaCasaAi.WhatsApp.Payload do
  @moduledoc """
  Extracts inbound messages from Meta WhatsApp webhook payloads.
  """

  def extract_messages(payload) when is_map(payload) do
    payload
    |> Map.get("entry", [])
    |> List.wrap()
    |> Enum.flat_map(&extract_entry/1)
  end

  defp extract_entry(%{"changes" => changes}) do
    changes
    |> List.wrap()
    |> Enum.flat_map(&extract_change/1)
  end

  defp extract_entry(_), do: []

  defp extract_change(%{"value" => value}) do
    contacts = Map.get(value, "contacts", [])
    wa_id = contacts |> List.first() |> Map.get("wa_id")
    phone_number_id = get_in(value, ["metadata", "phone_number_id"])
    profile_name = contacts |> List.first() |> get_in(["profile", "name"])

    value
    |> Map.get("messages", [])
    |> List.wrap()
    |> Enum.map(fn message ->
      %{
        wa_id: wa_id || Map.get(message, "from"),
        phone: Map.get(message, "from"),
        message_id: Map.get(message, "id"),
        type: Map.get(message, "type"),
        text: message_text(message),
        timestamp: Map.get(message, "timestamp"),
        phone_number_id: phone_number_id,
        profile_name: profile_name,
        message: message
      }
    end)
  end

  defp extract_change(_), do: []

  defp message_text(%{"type" => "text", "text" => %{"body" => body}}) when is_binary(body), do: body
  defp message_text(%{"text" => %{"body" => body}}) when is_binary(body), do: body
  defp message_text(_), do: nil
end
