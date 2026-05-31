defmodule MinhaCasaAiWeb.TelegramWebhookController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Telegram

  plug MinhaCasaAiWeb.Plugs.TelegramWebhookSecret when action in [:receive]

  def receive(conn, params) do
    :ok = Telegram.receive_webhook(params)
    json(conn, %{status: "ok"})
  end
end
