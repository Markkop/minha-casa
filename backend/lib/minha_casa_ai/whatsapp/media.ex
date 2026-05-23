defmodule MinhaCasaAi.WhatsApp.Media do
  @moduledoc """
  Downloads inbound WhatsApp media via the Graph API.
  """

  alias MinhaCasaAi.Config

  @graph_version "v23.0"

  def download_base64(%{"id" => media_id}) when is_binary(media_id) do
    if Config.configured?(:whatsapp) do
      with {:ok, url} <- fetch_media_url(media_id),
           {:ok, bytes} <- fetch_bytes(url),
           {:ok, mime} <- fetch_mime(media_id) do
        {:ok, %{base64: Base.encode64(bytes), mime_type: mime}}
      end
    else
      {:error, :whatsapp_not_configured}
    end
  end

  def download_base64(_), do: {:error, :invalid_media}

  defp fetch_media_url(media_id) do
    get_json("https://graph.facebook.com/#{@graph_version}/#{media_id}")
    |> case do
      {:ok, %{"url" => url}} when is_binary(url) -> {:ok, url}
      {:ok, body} -> {:error, {:missing_url, body}}
      {:error, reason} -> {:error, reason}
    end
  end

  defp fetch_mime(media_id) do
    case get_json("https://graph.facebook.com/#{@graph_version}/#{media_id}") do
      {:ok, %{"mime_type" => mime}} when is_binary(mime) -> {:ok, mime}
      _ -> {:ok, "application/octet-stream"}
    end
  end

  defp fetch_bytes(url) do
    token = Config.whatsapp_access_token()

    case Req.get(url, headers: [{"authorization", "Bearer #{token}"}]) do
      {:ok, %{status: status, body: body}} when status in 200..299 and is_binary(body) ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, {:download_failed, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp get_json(url) do
    token = Config.whatsapp_access_token()

    case Req.get(url, headers: [{"authorization", "Bearer #{token}"}]) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, {:graph_api, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
