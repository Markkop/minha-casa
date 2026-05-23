defmodule MinhaCasaAi.Telegram do
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Telegram.Event
  alias MinhaCasaAi.Workers.TelegramWebhookWorker

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
        |> TelegramWebhookWorker.new()
        |> Oban.insert()

        :ok

      {:ok, _} ->
        :ok

      {:error, _changeset} ->
        :ok
    end
  end

  def get_event(id), do: Repo.get(Event, id)

  defp event_id(%{"update_id" => update_id}) when is_integer(update_id), do: "tg-#{update_id}"
  defp event_id(%{"update_id" => update_id}) when is_binary(update_id), do: "tg-#{update_id}"

  defp event_id(payload) do
    "tg-" <> Base.encode16(:crypto.hash(:sha256, Jason.encode!(payload)), case: :lower)
  end
end
