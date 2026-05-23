defmodule MinhaCasaAi.Telegram.Router do
  alias MinhaCasaAi.Channel.Agent
  alias MinhaCasaAi.Telegram.{Client, Identities, LinkCodes, Templates}

  def handle(%{chat_id: chat_id} = inbound) when is_binary(chat_id) do
    if Identities.linked?(chat_id) do
      Agent.handle_telegram(inbound)
    else
      handle_unlinked(inbound)
    end
  end

  def handle(_), do: {:error, :missing_chat_id}

  defp handle_unlinked(%{chat_id: chat_id} = inbound) do
    case LinkCodes.create_for_chat_id(chat_id, inbound.telegram_user_id) do
      {:ok, %{code: code}} ->
        body = Templates.welcome_with_link(code)
        Client.send_message(chat_id, body)
        :ok

      {:error, reason} ->
        {:error, reason}
    end
  end
end
