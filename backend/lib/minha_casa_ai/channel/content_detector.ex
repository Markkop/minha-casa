defmodule MinhaCasaAi.Channel.ContentDetector do
  @url_regex ~r/https?:\/\/[^\s<>"']+/i

  def from_whatsapp_message(%{type: "text", message: %{"text" => %{"body" => body}}}) do
    text = String.trim(body || "")

    cond do
      text == "" ->
        {:error, :empty_text}

      url = first_url(text) ->
        {:ok, %{"kind" => "url", "url" => url}}

      true ->
        {:ok, %{"kind" => "text", "rawText" => text}}
    end
  end

  def from_whatsapp_message(%{type: "image", message: %{"image" => image}}) do
    with {:ok, %{base64: base64, mime_type: mime}} <-
           MinhaCasaAi.WhatsApp.Media.download_base64(image) do
      {:ok, %{"kind" => "image", "base64" => base64, "mimeType" => mime}}
    end
  end

  def from_whatsapp_message(%{type: "document", message: %{"document" => doc}}) do
    mime = Map.get(doc, "mime_type", "")

    if String.contains?(mime, "pdf") do
      with {:ok, %{base64: base64}} <- MinhaCasaAi.WhatsApp.Media.download_base64(doc) do
        {:ok, %{"kind" => "pdf", "base64" => base64}}
      end
    else
      {:error, :unsupported_document}
    end
  end

  def from_whatsapp_message(%{type: "audio"}) do
    {:error, :unsupported_audio}
  end

  def from_whatsapp_message(_), do: {:error, :unsupported_message_type}

  def from_telegram_message(%{type: "text", message: %{"text" => text}}) when is_binary(text) do
    body = String.trim(text)

    cond do
      body == "" ->
        {:error, :empty_text}

      url = first_url(body) ->
        {:ok, %{"kind" => "url", "url" => url}}

      true ->
        {:ok, %{"kind" => "text", "rawText" => body}}
    end
  end

  def from_telegram_message(%{type: "photo", message: %{"photo" => photos}})
      when is_list(photos) do
    photo = List.last(photos)
    file_id = Map.get(photo, "file_id")

    with {:ok, %{base64: base64}} <- MinhaCasaAi.Telegram.Media.download_base64(file_id) do
      {:ok, %{"kind" => "image", "base64" => base64, "mimeType" => "image/jpeg"}}
    end
  end

  def from_telegram_message(%{type: "document", message: %{"document" => doc}}) do
    mime = Map.get(doc, "mime_type", "")

    if String.contains?(mime, "pdf") do
      with {:ok, %{base64: base64}} <-
             MinhaCasaAi.Telegram.Media.download_base64(Map.get(doc, "file_id")) do
        {:ok, %{"kind" => "pdf", "base64" => base64}}
      end
    else
      {:error, :unsupported_document}
    end
  end

  def from_telegram_message(%{type: type}) when type in ["voice", "audio"] do
    {:error, :unsupported_audio}
  end

  def from_telegram_message(_), do: {:error, :unsupported_message_type}

  defp first_url(text) do
    case Regex.run(@url_regex, text) do
      [url | _] -> String.trim_trailing(url, ".,")
      _ -> nil
    end
  end
end
