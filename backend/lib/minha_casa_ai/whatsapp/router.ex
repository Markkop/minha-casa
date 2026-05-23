defmodule MinhaCasaAi.WhatsApp.Router do
  @moduledoc """
  Routes inbound WhatsApp messages to onboarding templates or the channel agent.
  """

  alias MinhaCasaAi.Channel.Agent
  alias MinhaCasaAi.WhatsApp.{Client, Identities, LinkCodes, Templates}

  def handle(%{wa_id: wa_id, phone: phone} = inbound) when is_binary(wa_id) do
    if Identities.linked?(wa_id) do
      Agent.handle_whatsapp(inbound)
    else
      handle_unlinked(wa_id, phone)
    end
  end

  def handle(_), do: {:error, :missing_wa_id}

  defp handle_unlinked(wa_id, phone) do
    case LinkCodes.create_for_wa_id(wa_id, phone) do
      {:ok, %{code: code}} ->
        body = Templates.welcome_with_link(code)
        Client.send_text(phone, body)
        :ok

      {:error, reason} ->
        {:error, reason}
    end
  end
end
