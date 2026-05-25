defmodule MinhaCasaAi.WhatsApp.Client do
  @moduledoc """
  Sends outbound WhatsApp Cloud API messages.
  """

  alias MinhaCasaAi.Config

  @graph_version "v23.0"

  def send_text(to, body) when is_binary(to) and is_binary(body) do
    trimmed = String.trim(body)

    if trimmed == "" do
      {:error, :empty_body}
    else
      do_send(to, trimmed)
    end
  end

  defp do_send(to, body) do
    if Config.configured?(:whatsapp) do
      phone_number_id = Config.whatsapp_phone_number_id()
      token = Config.whatsapp_access_token()

      url =
        "https://graph.facebook.com/#{@graph_version}/#{phone_number_id}/messages"

      payload = %{
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalize_to(to),
        type: "text",
        text: %{preview_url: true, body: body}
      }

      case Req.post(url,
             json: payload,
             headers: [{"authorization", "Bearer #{token}"}]
           ) do
        {:ok, %{status: status}} when status in 200..299 ->
          :ok

        {:ok, %{status: status, body: resp_body}} ->
          {:error, {:graph_api, status, resp_body}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      require Logger
      Logger.info("[whatsapp] dry-run to=#{to}: #{String.slice(body, 0, 120)}")
      :ok
    end
  end

  defp normalize_to(phone) do
    phone
    |> String.replace(~r/\D/, "")
    |> maybe_insert_br_mobile_ninth()
  end

  # Meta often returns Brazilian mobiles without the extra 9 after the area code
  # (e.g. wa_id 554896792216) while Graph API send requires 5548996792216.
  defp maybe_insert_br_mobile_ninth(<<"55", area::binary-size(2), local::binary-size(8)>>) do
    if String.match?(local, ~r/^[6-9]/) do
      "55" <> area <> "9" <> local
    else
      "55" <> area <> local
    end
  end

  defp maybe_insert_br_mobile_ninth(digits), do: digits
end
