defmodule MinhaCasaAi.Workers.TelegramWebhookWorker do
  use Oban.Worker,
    queue: :webhooks,
    max_attempts: 5

  alias MinhaCasaAi.Telegram
  alias MinhaCasaAi.Telegram.{Payload, Router}

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"payload" => payload}}) when is_map(payload) do
    payload
    |> Payload.extract_messages()
    |> Enum.each(&Router.handle/1)

    :ok
  end

  def perform(%Oban.Job{args: %{"event_id" => event_id}}) do
    case Telegram.get_event(event_id) do
      nil -> {:cancel, "event not found"}
      %{payload: payload} -> perform(%Oban.Job{args: %{"payload" => payload}})
    end
  end
end
