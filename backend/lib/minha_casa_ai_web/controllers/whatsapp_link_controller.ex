defmodule MinhaCasaAiWeb.WhatsAppLinkController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.WhatsApp.{Client, Identities, LinkCodes, Templates}

  def link(conn, %{"code" => code}) do
    user_id = conn.assigns[:current_user_id]

    with :ok <- require_user_id(user_id),
         {:ok, link_code} <- fetch_pending(code),
         {:ok, identity} <- Identities.link!(link_code.wa_id, user_id, link_code.phone),
         _ <- LinkCodes.consume!(link_code, user_id),
         :ok <- notify_whatsapp(link_code.phone, Templates.linked_confirmation()) do
      json(conn, %{
        ok: true,
        linkedAt: identity.linked_at,
        waId: identity.wa_id
      })
    else
      {:error, {:already_linked, _other}} ->
        conn
        |> put_status(:conflict)
        |> json(%{error: "Este WhatsApp já está vinculado a outra conta."})

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

      %{linked_at: linked_at, wa_id: wa_id, phone: phone} ->
        json(conn, %{
          linked: true,
          linkedAt: linked_at,
          waId: wa_id,
          phone: phone
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

  defp notify_whatsapp(phone, body) when is_binary(phone) do
    Client.send_text(phone, body)
  end

  defp notify_whatsapp(_, _), do: :ok
end
