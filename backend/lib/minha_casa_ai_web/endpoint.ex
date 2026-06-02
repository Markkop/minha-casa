defmodule MinhaCasaAiWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :minha_casa_ai

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library(),
    body_reader: {MinhaCasaAiWeb.Plugs.RawBodyReader, :read_body, []}

  plug Plug.MethodOverride
  plug Plug.Head
  plug MinhaCasaAiWeb.Plugs.Cors
  plug MinhaCasaAiWeb.Router
end
