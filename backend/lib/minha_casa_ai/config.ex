defmodule MinhaCasaAi.Config do
  def internal_api_secret, do: get(:internal_api_secret)
  def openai_api_key, do: get(:openai_api_key)
  def openai_model, do: get(:openai_model) || "gpt-5.4-mini"
  def openai_reasoning_effort, do: get(:openai_reasoning_effort) || "low"
  def scrapingant_api_key, do: get(:scrapingant_api_key)
  def brave_search_api_key, do: get(:brave_search_api_key)
  def google_maps_server_api_key, do: get(:google_maps_server_api_key)
  def minio_endpoint, do: get(:minio_endpoint)
  def minio_bucket, do: get(:minio_bucket)
  def minio_access_key, do: get(:minio_access_key)
  def minio_secret_key, do: get(:minio_secret_key)
  def whatsapp_verify_token, do: get(:whatsapp_verify_token)
  def whatsapp_access_token, do: get(:whatsapp_access_token)
  def whatsapp_phone_number_id, do: get(:whatsapp_phone_number_id)
  def whatsapp_app_secret, do: get(:whatsapp_app_secret)
  def telegram_bot_token, do: get(:telegram_bot_token)
  def telegram_webhook_secret, do: get(:telegram_webhook_secret)
  def app_public_url, do: get(:app_public_url)
  def assistant_llm_enabled? do
    case get(:assistant_llm_enabled) do
      false -> false
      "false" -> false
      "0" -> false
      _ -> true
    end
  end

  def configured?(:assistant_llm), do: assistant_llm_enabled?() and configured?(:openai)

  def configured?(:openai), do: present?(openai_api_key())
  def configured?(:scrapingant), do: present?(scrapingant_api_key())
  def configured?(:brave_search), do: present?(brave_search_api_key())
  def configured?(:google_maps), do: present?(google_maps_server_api_key())

  def configured?(:minio) do
    Enum.all?(
      [minio_endpoint(), minio_bucket(), minio_access_key(), minio_secret_key()],
      &present?/1
    )
  end

  def configured?(:whatsapp) do
    Enum.all?([whatsapp_access_token(), whatsapp_phone_number_id()], &present?/1)
  end

  def configured?(:whatsapp_webhook_signature) do
    present?(whatsapp_app_secret())
  end

  def configured?(:telegram) do
    present?(telegram_bot_token())
  end

  defp get(key), do: Application.get_env(:minha_casa_ai, __MODULE__, []) |> Keyword.get(key)
  defp present?(value), do: is_binary(value) && String.trim(value) != ""
end
