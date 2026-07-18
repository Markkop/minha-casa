defmodule MinhaCasaAiWeb.Plugs.WhatsAppSignature do
  import Plug.Conn

  alias MinhaCasaAi.Config

  def init(opts), do: opts

  def call(conn, _opts) do
    secret = Config.whatsapp_app_secret()

    if present?(secret) do
      verify_or_halt(conn, secret)
    else
      conn
    end
  end

  defp verify_or_halt(conn, secret) do
    signature =
      conn
      |> get_req_header("x-hub-signature-256")
      |> List.first()

    raw_body = conn.assigns[:raw_body] |> List.first()

    if is_binary(signature) and is_binary(raw_body) and
         secure_equals?(signature, secret, raw_body) do
      conn
    else
      conn
      |> put_resp_content_type("text/plain")
      |> send_resp(401, "Invalid signature")
      |> halt()
    end
  end

  defp secure_equals?("sha256=" <> provided, secret, raw_body) do
    expected =
      :crypto.mac(:hmac, :sha256, secret, raw_body)
      |> Base.encode16(case: :lower)

    provided == expected and byte_size(provided) == byte_size(expected)
  end

  defp secure_equals?(_, _, _), do: false

  defp present?(value), do: is_binary(value) and String.trim(value) != ""
end
