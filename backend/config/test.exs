import Config

config :logger, level: :warning

config :minha_casa_ai, MinhaCasaAiWeb.Endpoint,
  server: false,
  secret_key_base: String.duplicate("test-secret-key-base-", 5)

config :minha_casa_ai, MinhaCasaAi.Config,
  internal_api_secret: "test-internal-api-secret",
  property_analysis_engine: "legacy",
  hermes_analysis_timeout_ms: 1_000,
  hermes_jobs_dir: System.tmp_dir!(),
  better_auth_jwks_url: "http://localhost:5173/auth/jwks",
  langfuse_enabled: false
