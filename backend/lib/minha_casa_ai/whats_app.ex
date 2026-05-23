defmodule MinhaCasaAi.WhatsApp do
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.WhatsApp.Event
  alias MinhaCasaAi.Workers.WhatsAppWebhookWorker

  def receive_webhook(payload) when is_map(payload) do
    provider_id = event_id(payload)

    changeset =
      %Event{}
      |> Event.changeset(%{
        provider_event_id: provider_id,
        payload: payload,
        status: "received"
      })

    case Repo.insert(changeset,
           on_conflict: :nothing,
           conflict_target: :provider_event_id,
           returning: true
         ) do
      {:ok, %{id: id}} when is_binary(id) ->
        %{payload: payload, event_id: id}
        |> WhatsAppWebhookWorker.new()
        |> Oban.insert()

        :ok

      {:ok, _} ->
        :ok

      {:error, _changeset} ->
        :ok
    end
  end

  def get_event(id), do: Repo.get(Event, id)

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
end
