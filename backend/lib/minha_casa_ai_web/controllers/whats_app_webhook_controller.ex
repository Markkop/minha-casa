defmodule MinhaCasaAiWeb.WhatsAppWebhookController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.WhatsApp

  plug MinhaCasaAiWeb.Plugs.WhatsAppSignature when action in [:receive]

  def verify(conn, params) do
    mode = params["hub.mode"]
    token = params["hub.verify_token"]
    challenge = params["hub.challenge"]

    if mode == "subscribe" && token == Config.whatsapp_verify_token() && is_binary(challenge) do
      text(conn, challenge)
    else
      conn |> put_status(:forbidden) |> json(%{error: "Forbidden"})
    end
  end

  def receive(conn, params) do
    :ok = WhatsApp.receive_webhook(params)
    json(conn, %{status: "ok"})
  end
end
