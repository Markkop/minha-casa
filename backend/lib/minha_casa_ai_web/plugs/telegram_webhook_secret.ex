defmodule MinhaCasaAiWeb.Plugs.TelegramWebhookSecret do
  import Plug.Conn

  alias MinhaCasaAi.Config

  def init(opts), do: opts

  def call(conn, _opts) do
    secret = Config.telegram_webhook_secret()

    if present?(secret) do
      verify_or_halt(conn, secret)
    else
      conn
    end
  end

  defp verify_or_halt(conn, secret) do
    header =
      conn
      |> get_req_header("x-telegram-bot-api-secret-token")
      |> List.first()

    if is_binary(header) and secure_equals?(header, secret) do
      conn
    else
      conn
      |> put_resp_content_type("text/plain")
      |> send_resp(401, "Invalid secret token")
      |> halt()
    end
  end

  defp secure_equals?(a, b) when is_binary(a) and is_binary(b) do
    byte_size(a) == byte_size(b) and :crypto.hash_equals(a, b)
  end

  defp secure_equals?(_, _), do: false

  defp present?(value), do: is_binary(value) and String.trim(value) != ""
end
