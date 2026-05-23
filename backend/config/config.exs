import Config

config :minha_casa_ai,
  ecto_repos: [MinhaCasaAi.Repo],
  generators: [binary_id: true]

config :minha_casa_ai, MinhaCasaAiWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [
    formats: [json: MinhaCasaAiWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: MinhaCasaAi.PubSub,
  live_view: [signing_salt: "minha-casa-ai"]

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

config :phoenix, :json_library, Jason

config :req, default_finch: MinhaCasaAi.Finch

config :minha_casa_ai, Oban,
  repo: MinhaCasaAi.Repo,
  engine: Oban.Engines.Basic,
  queues: [ai: 5, default: 5, webhooks: 5]

import_config "#{config_env()}.exs"
