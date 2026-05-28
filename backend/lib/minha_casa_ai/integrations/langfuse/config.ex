defmodule MinhaCasaAi.Integrations.Langfuse.Config do
  @moduledoc false

  alias MinhaCasaAi.Config, as: AppConfig

  def enabled?, do: AppConfig.langfuse_enabled?()
  def configured?, do: AppConfig.configured?(:langfuse)
  def host, do: AppConfig.langfuse_host()
  def public_key, do: AppConfig.langfuse_public_key()
  def secret_key, do: AppConfig.langfuse_secret_key()
  def env, do: AppConfig.langfuse_env()
  def prompt_label, do: AppConfig.langfuse_prompt_label()

  def auth_header do
    credentials = "#{public_key()}:#{secret_key()}"
    "Basic " <> Base.encode64(credentials)
  end
end
