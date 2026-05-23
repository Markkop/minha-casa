defmodule MinhaCasaAi.Telegram.Media do
  alias MinhaCasaAi.Config

  def download_base64(file_id) when is_binary(file_id) do
    if Config.configured?(:telegram) do
      with {:ok, path} <- get_file_path(file_id),
           {:ok, bytes} <- download_file(path) do
        {:ok, %{base64: Base.encode64(bytes), mime_type: "application/octet-stream"}}
      end
    else
      {:error, :telegram_not_configured}
    end
  end

  def download_base64(_), do: {:error, :invalid_file}

  defp get_file_path(file_id) do
    token = Config.telegram_bot_token()
    url = "https://api.telegram.org/bot#{token}/getFile"

    case Req.get(url, params: [file_id: file_id]) do
      {:ok, %{status: status, body: %{"ok" => true, "result" => %{"file_path" => path}}}}
      when status in 200..299 ->
        {:ok, path}

      {:ok, %{status: status, body: body}} ->
        {:error, {:telegram_api, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp download_file(path) do
    token = Config.telegram_bot_token()
    url = "https://api.telegram.org/file/bot#{token}/#{path}"

    case Req.get(url) do
      {:ok, %{status: status, body: body}} when status in 200..299 and is_binary(body) ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, {:download_failed, status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
