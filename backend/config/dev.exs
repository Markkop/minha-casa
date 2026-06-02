import Config

config :minha_casa_ai, env: :dev

config :minha_casa_ai, MinhaCasaAiWeb.Endpoint,
  http: [ip: {0, 0, 0, 0}, port: String.to_integer(System.get_env("PORT") || "4000")],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: String.duplicate("dev-secret-key-base-", 5)

config :minha_casa_ai, dev_routes: true

config :logger, level: :info
