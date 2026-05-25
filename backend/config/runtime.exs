import Config

database_url =
  System.get_env("DATABASE_URL") ||
    "postgresql://minhacasa:minhacasa_local_password@postgres:5432/minha_casa_local"

pool_size = String.to_integer(System.get_env("DATABASE_POOL_MAX") || "10")

ssl? =
  String.downcase(System.get_env("DATABASE_SSL") || "false") in ["1", "true", "yes"]

config :minha_casa_ai, MinhaCasaAi.Repo,
  url: database_url,
  pool_size: pool_size,
  ssl: ssl?,
  ssl_opts: [verify: :verify_none]

config :minha_casa_ai, MinhaCasaAiWeb.Endpoint,
  server: true,
  http: [
    ip: {0, 0, 0, 0},
    port: String.to_integer(System.get_env("PORT") || "4000")
  ],
  secret_key_base:
    System.get_env("SECRET_KEY_BASE") ||
      String.duplicate("local-secret-key-base-", 5)

config :minha_casa_ai, MinhaCasaAi.Config,
  internal_api_secret: System.get_env("INTERNAL_API_SECRET"),
  openai_api_key: System.get_env("OPENAI_API_KEY"),
  scrapingant_api_key: System.get_env("SCRAPINGANT_API_KEY"),
  brave_search_api_key: System.get_env("BRAVE_SEARCH_API_KEY"),
  minio_endpoint: System.get_env("MINIO_ENDPOINT"),
  minio_bucket: System.get_env("MINIO_BUCKET"),
  minio_access_key: System.get_env("MINIO_ACCESS_KEY"),
  minio_secret_key: System.get_env("MINIO_SECRET_KEY"),
  whatsapp_verify_token: System.get_env("WHATSAPP_VERIFY_TOKEN"),
  whatsapp_access_token: System.get_env("WHATSAPP_ACCESS_TOKEN"),
  whatsapp_phone_number_id: System.get_env("WHATSAPP_PHONE_NUMBER_ID"),
  whatsapp_app_secret: System.get_env("WHATSAPP_APP_SECRET"),
  telegram_bot_token: System.get_env("TELEGRAM_BOT_TOKEN"),
  telegram_webhook_secret: System.get_env("TELEGRAM_WEBHOOK_SECRET"),
  app_public_url:
    System.get_env("APP_PUBLIC_URL") || System.get_env("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
  assistant_llm_enabled: System.get_env("ASSISTANT_LLM_ENABLED", "true") not in ["false", "0"]
