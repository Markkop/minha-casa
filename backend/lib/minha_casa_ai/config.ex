defmodule MinhaCasaAi.Config do
  def internal_api_secret, do: get(:internal_api_secret)
  def openai_api_key, do: get(:openai_api_key)
  def scrapingant_api_key, do: get(:scrapingant_api_key)
  def minio_endpoint, do: get(:minio_endpoint)
  def minio_bucket, do: get(:minio_bucket)
  def minio_access_key, do: get(:minio_access_key)
  def minio_secret_key, do: get(:minio_secret_key)
  def whatsapp_verify_token, do: get(:whatsapp_verify_token)
  def whatsapp_access_token, do: get(:whatsapp_access_token)
  def whatsapp_phone_number_id, do: get(:whatsapp_phone_number_id)

  def configured?(:openai), do: present?(openai_api_key())
  def configured?(:scrapingant), do: present?(scrapingant_api_key())

  def configured?(:minio) do
    Enum.all?(
      [minio_endpoint(), minio_bucket(), minio_access_key(), minio_secret_key()],
      &present?/1
    )
  end

  def configured?(:whatsapp) do
    Enum.all?([whatsapp_access_token(), whatsapp_phone_number_id()], &present?/1)
  end

  defp get(key), do: Application.get_env(:minha_casa_ai, __MODULE__, []) |> Keyword.get(key)
  defp present?(value), do: is_binary(value) && String.trim(value) != ""
end
