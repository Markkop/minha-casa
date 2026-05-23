defmodule MinhaCasaAi.Telegram.Router do
  alias MinhaCasaAi.Assistant.Router, as: AssistantRouter
  alias MinhaCasaAi.Telegram.{Client, Identities, LinkCodes, Templates}

  def handle(%{chat_id: chat_id} = inbound) when is_binary(chat_id) do
    if Identities.linked?(chat_id) do
      user_id = inbound_user_id(chat_id)
      AssistantRouter.handle("telegram", inbound, user_id)
    else
      handle_unlinked(inbound)
    end
  end

  def handle(_), do: {:error, :missing_chat_id}

  defp inbound_user_id(chat_id) do
    case Identities.get_by_chat_id(chat_id) do
      %{user_id: user_id} -> user_id
      _ -> nil
    end
  end

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
