defmodule MinhaCasaAiWeb.StripeWebhookController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Billing

  def receive(conn, _params) do
    raw_body =
      conn.assigns
      |> Map.get(:raw_body, [])
      |> Enum.reverse()
      |> IO.iodata_to_binary()

    signature = conn |> get_req_header("stripe-signature") |> List.first()

    with {:ok, event} <- Billing.verify_stripe_event(raw_body, signature),
         {:ok, result} <- Billing.process_stripe_event(event) do
      json(conn, %{received: true, duplicate: result == :duplicate})
    else
      {:error, :webhook_not_configured} ->
        conn |> put_status(:internal_server_error) |> json(%{error: "Webhook not configured"})

      {:error, :missing_signature} ->
        conn |> put_status(:bad_request) |> json(%{error: "Missing stripe-signature header"})

      {:error, :invalid_signature} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid signature"})

      {:error, :invalid_payload} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid payload"})

      {:error, {:stripe_webhook, _message}} ->
        conn |> put_status(:internal_server_error) |> json(%{error: "Webhook handler failed"})
    end
  end
end
