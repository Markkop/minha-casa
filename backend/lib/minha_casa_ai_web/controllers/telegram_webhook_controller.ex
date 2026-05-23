defmodule MinhaCasaAiWeb.TelegramWebhookController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Telegram

  plug MinhaCasaAiWeb.Plugs.TelegramWebhookSecret when action in [:receive]

  def receive(conn, params) do
    case Telegram.receive_webhook(params) do
      :ok ->
        json(conn, %{status: "ok"})

      {:error, reason} ->
        conn |> put_status(:accepted) |> json(%{status: "ignored", reason: inspect(reason)})
    end
  end
end
