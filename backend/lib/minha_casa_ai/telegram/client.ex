defmodule MinhaCasaAi.Telegram.Client do
  alias MinhaCasaAi.Config

  def send_message(chat_id, text) when is_binary(text) do
    trimmed = String.trim(text)

    if trimmed == "" do
      {:error, :empty_body}
    else
      do_send(chat_id, trimmed)
    end
  end

  defp do_send(chat_id, body) do
    if Config.configured?(:telegram) do
      token = Config.telegram_bot_token()
      url = "https://api.telegram.org/bot#{token}/sendMessage"

      payload = %{
        chat_id: normalize_chat_id(chat_id),
        text: body,
        disable_web_page_preview: false
      }

      case Req.post(url, json: payload) do
        {:ok, %{status: status, body: %{"ok" => true}}} when status in 200..299 ->
          :ok

        {:ok, %{status: status, body: resp_body}} ->
          {:error, {:telegram_api, status, resp_body}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      require Logger
      Logger.info("[telegram] dry-run chat_id=#{chat_id}: #{String.slice(body, 0, 120)}")
      :ok
    end
  end

  defp normalize_chat_id(chat_id) when is_integer(chat_id), do: chat_id
  defp normalize_chat_id(chat_id) when is_binary(chat_id) do
    case Integer.parse(chat_id) do
      {id, ""} -> id
      _ -> chat_id
    end
  end
end
