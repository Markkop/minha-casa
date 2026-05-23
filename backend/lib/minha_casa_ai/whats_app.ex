defmodule MinhaCasaAi.WhatsApp do
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.WhatsApp.Event
  alias MinhaCasaAi.Workflows

  def receive_webhook(payload) when is_map(payload) do
    Repo.transaction(fn ->
      event =
        %Event{}
        |> Event.changeset(%{
          provider_event_id: event_id(payload),
          payload: payload,
          status: "received"
        })
        |> Repo.insert!(
          on_conflict: :nothing,
          conflict_target: :provider_event_id
        )

      payload
      |> extract_text_messages()
      |> Enum.each(fn text ->
        Workflows.create_ingestion(%{input: %{"kind" => "text", "rawText" => text}})
      end)

      event
    end)
    |> case do
      {:ok, _event} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp event_id(payload) do
    payload
    |> get_in([
      "entry",
      Access.at(0),
      "changes",
      Access.at(0),
      "value",
      "messages",
      Access.at(0),
      "id"
    ])
    |> case do
      id when is_binary(id) ->
        id

      _ ->
        "webhook-" <> Base.encode16(:crypto.hash(:sha256, Jason.encode!(payload)), case: :lower)
    end
  end

  defp extract_text_messages(payload) do
    payload
    |> get_in(["entry", Access.all(), "changes", Access.all(), "value", "messages"])
    |> List.wrap()
    |> List.flatten()
    |> Enum.flat_map(fn
      %{"text" => %{"body" => body}} when is_binary(body) -> [body]
      _ -> []
    end)
  end
end
