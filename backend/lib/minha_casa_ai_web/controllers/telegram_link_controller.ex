defmodule MinhaCasaAiWeb.TelegramLinkController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Telegram.{Client, Identities, LinkCodes, Templates}

  def link(conn, %{"code" => code}) do
    user_id = conn.assigns[:current_user_id]

    with :ok <- require_user_id(user_id),
         {:ok, link_code} <- fetch_pending(code),
         {:ok, identity} <-
           Identities.link!(link_code.chat_id, user_id, link_code.telegram_user_id),
         _ <- LinkCodes.consume!(link_code, user_id),
         :ok <- notify_telegram(link_code.chat_id, Templates.linked_confirmation()) do
      json(conn, %{
        ok: true,
        linkedAt: identity.linked_at,
        chatId: identity.chat_id
      })
    else
      {:error, {:already_linked, _other}} ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "Este Telegram já está vinculado a outra conta."})

      {:error, :invalid_code} ->
        conn |> put_status(:not_found) |> json(%{error: "Código inválido ou expirado."})

      {:error, :unauthorized} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(reason)})
    end
  end

  def status(conn, _params) do
    user_id = conn.assigns[:current_user_id]

    case Identities.get_by_user_id(user_id) do
      nil ->
        json(conn, %{linked: false})

      %{linked_at: linked_at, chat_id: chat_id, telegram_user_id: telegram_user_id} ->
        json(conn, %{
          linked: true,
          linkedAt: linked_at,
          chatId: chat_id,
          telegramUserId: telegram_user_id
        })
    end
  end

  defp require_user_id(user_id) when is_binary(user_id) and user_id != "", do: :ok
  defp require_user_id(_), do: {:error, :unauthorized}

  defp fetch_pending(code) do
    case LinkCodes.get_pending(code) do
      nil -> {:error, :invalid_code}
      link_code -> {:ok, link_code}
    end
  end

  defp notify_telegram(chat_id, body) when is_binary(chat_id) do
    Client.send_message(chat_id, body)
  end

  defp notify_telegram(_, _), do: :ok
end
