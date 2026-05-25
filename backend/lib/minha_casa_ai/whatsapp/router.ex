defmodule MinhaCasaAi.WhatsApp.Router do
  @moduledoc """
  Routes inbound WhatsApp messages to onboarding templates or the channel agent.
  """

  alias MinhaCasaAi.Assistant.Router, as: AssistantRouter
  alias MinhaCasaAi.WhatsApp.{Client, Identities, LinkCodes, Templates}

  def handle(%{wa_id: wa_id, phone: phone} = inbound) when is_binary(wa_id) do
    if Identities.linked?(wa_id) do
      user_id =
        case Identities.get_by_wa_id(wa_id) do
          %{user_id: id} -> id
          _ -> nil
        end

      AssistantRouter.handle("whatsapp", inbound, user_id)
    else
      handle_unlinked(wa_id, phone)
    end
  end

  def handle(_), do: {:error, :missing_wa_id}

  defp send_or_log(phone, body) do
    case Client.send_text(phone, body) do
      :ok ->
        :ok

      {:error, reason} ->
        require Logger
        Logger.warning("[whatsapp] send failed to=#{phone}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp handle_unlinked(wa_id, phone) do
    case LinkCodes.create_for_wa_id(wa_id, phone) do
      {:ok, %{code: code}} ->
        body = Templates.welcome_with_link(code)
        send_or_log(phone, body)

      {:error, reason} ->
        {:error, reason}
    end
  end
end
