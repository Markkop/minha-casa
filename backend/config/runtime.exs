import Config

database_url =
  System.get_env("DATABASE_URL") ||
    "postgresql://minhacasa:minhacasa_local_password@postgres:5432/minha_casa_local"

pool_size = String.to_integer(System.get_env("DATABASE_POOL_MAX") || "10")

ssl? =
  String.downcase(System.get_env("DATABASE_SSL") || "false") in ["1", "true", "yes"]

non_empty_env = fn key ->
  case System.get_env(key) do
    value when is_binary(value) ->
      value = String.trim(value)
      if value == "", do: nil, else: value

    _ ->
      nil
  end
end

app_public_url =
  if config_env() == :test do
    ""
  else
    non_empty_env.("APP_PUBLIC_URL") || "http://localhost:5173"
  end

better_auth_jwks_url =
  non_empty_env.("BETTER_AUTH_JWKS_URL") ||
    if app_public_url == "" do
      "http://localhost:5173/api/auth/jwks"
    else
      String.trim_trailing(app_public_url, "/") <> "/api/auth/jwks"
    end

config :minha_casa_ai, MinhaCasaAi.Repo,
  url: database_url,
  pool_size: pool_size,
  ssl: ssl?,
  ssl_opts: [verify: :verify_none]

config :minha_casa_ai,
  cors_origins:
    (System.get_env("CORS_ORIGINS") || "http://localhost:5173")
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))

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
  hermes_api_url: System.get_env("HERMES_API_URL"),
  hermes_api_key: System.get_env("HERMES_API_KEY"),
  hermes_jobs_dir: System.get_env("HERMES_JOBS_DIR") || "/work/hermes-jobs",
  hermes_analysis_timeout_ms:
    String.to_integer(System.get_env("HERMES_ANALYSIS_TIMEOUT_MS") || "1800000"),
  property_analysis_engine: System.get_env("PROPERTY_ANALYSIS_ENGINE"),
  scrapingant_api_key: System.get_env("SCRAPINGANT_API_KEY"),
  brave_search_api_key: System.get_env("BRAVE_SEARCH_API_KEY"),
  google_maps_server_api_key:
    System.get_env("GOOGLE_MAPS_SERVER_API_KEY") ||
      System.get_env("PUBLIC_GOOGLE_MAPS_API_KEY"),
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
  better_auth_jwks_url: better_auth_jwks_url,
  app_public_url: app_public_url,
  stripe_secret_key: System.get_env("STRIPE_SECRET_KEY"),
  stripe_webhook_secret: System.get_env("STRIPE_WEBHOOK_SECRET"),
  assistant_llm_enabled: System.get_env("ASSISTANT_LLM_ENABLED", "true") not in ["false", "0"],
  openai_model:
    System.get_env("OPENAI_MODEL") ||
      System.get_env("PROPERTY_AGENT_CHAT_MODEL") ||
      System.get_env("PROPERTY_AGENT_VISION_MODEL") ||
      "gpt-5.4-mini",
  openai_reasoning_effort: System.get_env("OPENAI_REASONING_EFFORT", "low"),
  # Deprecated: use OPENAI_MODEL. Kept for backward-compatible deploys.
  property_agent_chat_model:
    System.get_env("PROPERTY_AGENT_CHAT_MODEL") ||
      System.get_env("OPENAI_MODEL") ||
      "gpt-5.4-mini",
  property_agent_vision_model:
    System.get_env("PROPERTY_AGENT_VISION_MODEL") ||
      System.get_env("OPENAI_MODEL") ||
      "gpt-5.4-mini",
  property_analysis_max_agent_concurrency:
    String.to_integer(System.get_env("PROPERTY_ANALYSIS_MAX_AGENT_CONCURRENCY") || "2"),
  property_analysis_max_spaces:
    String.to_integer(System.get_env("PROPERTY_ANALYSIS_MAX_SPACES") || "10"),
  property_analysis_max_images:
    String.to_integer(System.get_env("PROPERTY_ANALYSIS_MAX_IMAGES") || "40"),
  property_analysis_photo_concurrency:
    String.to_integer(System.get_env("PROPERTY_ANALYSIS_PHOTO_CONCURRENCY") || "4"),
  langfuse_host: System.get_env("LANGFUSE_HOST"),
  langfuse_public_key: System.get_env("LANGFUSE_PUBLIC_KEY"),
  langfuse_secret_key: System.get_env("LANGFUSE_SECRET_KEY"),
  langfuse_enabled: System.get_env("LANGFUSE_ENABLED", "false") not in ["false", "0"],
  langfuse_env: System.get_env("LANGFUSE_ENV", "local"),
  langfuse_prompt_label: System.get_env("LANGFUSE_PROMPT_LABEL", "production"),
  portal_search_cache_ttl_days:
    String.to_integer(System.get_env("PORTAL_SEARCH_CACHE_TTL_DAYS") || "30"),
  retention_purge_enabled: System.get_env("RETENTION_PURGE_ENABLED", "true") not in ["false", "0"]

config :image, concurrency: String.to_integer(System.get_env("VIPS_CONCURRENCY") || "2")
