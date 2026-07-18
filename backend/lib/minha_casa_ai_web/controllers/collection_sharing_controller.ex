defmodule MinhaCasaAiWeb.CollectionSharingController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings.CollectionSharing
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Config

  def invite_preview(conn, %{"token" => token}) do
    case CollectionSharing.invite_preview(token) do
      {:ok, preview} ->
        json(conn, %{
          collectionName: preview.collection_name,
          role: preview.role,
          expiresAt: DateTime.to_iso8601(preview.expires_at),
          emailRestricted: preview.email_restricted
        })

      {:error, _} ->
        not_found(conn)
    end
  end

  def claim_link(conn, %{"token" => token}) do
    case CollectionSharing.claim_link(token, conn.assigns.current_user_id) do
      {:ok, grant} ->
        json(conn, %{success: true, grantId: grant.id, collectionId: grant.collection_id})

      {:error, _} ->
        not_found(conn)
    end
  end

  def create_invite(conn, %{"id" => collection_id} = params) do
    case CollectionSharing.create_invite(collection_id, conn.assigns.current_user_id, params) do
      {:ok, invite, token} ->
        conn
        |> put_status(:created)
        |> json(%{
          invite: %{
            id: invite.id,
            role: invite.role,
            status: invite.status,
            expiresAt: DateTime.to_iso8601(invite.expires_at),
            shareUrl: share_url(token)
          }
        })

      {:error, :sharing_not_allowed} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Editable sharing is not available for this plan"})

      {:error, :forbidden} ->
        not_found(conn)

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def accept_invite(conn, %{"token" => token}) do
    user = Repo.get(User, conn.assigns.current_user_id)

    case CollectionSharing.accept_invite(token, conn.assigns.current_user_id, user && user.email) do
      {:ok, grant} ->
        json(conn, %{success: true, grantId: grant.id, collectionId: grant.collection_id})

      {:error, :email_mismatch} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "This invitation was sent to another email"})

      {:error, reason} when reason in [:expired, :unavailable] ->
        conn |> put_status(:gone) |> json(%{error: "Invitation is no longer available"})

      {:error, _} ->
        not_found(conn)
    end
  end

  def revoke_grant(conn, %{"id" => collection_id, "grant_id" => grant_id}) do
    case CollectionSharing.revoke_grant(collection_id, grant_id, conn.assigns.current_user_id) do
      {:ok, _grant} -> json(conn, %{success: true})
      {:error, _} -> not_found(conn)
    end
  end

  defp share_url(token) do
    String.trim_trailing(Config.app_public_url() || "", "/") <> "/share/#{token}"
  end

  defp not_found(conn), do: conn |> put_status(:not_found) |> json(%{error: "Share not found"})

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    conn |> put_status(:bad_request) |> json(%{error: inspect(changeset.errors)})
  end

  defp changeset_error(conn, _),
    do: conn |> put_status(:bad_request) |> json(%{error: "Invalid share"})
end
