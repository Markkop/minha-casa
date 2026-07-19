defmodule MinhaCasaAiWeb.CollectionSharingController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings.CollectionSharing
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Config
  alias MinhaCasaAiWeb.PublicError

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
        PublicError.json_error(conn, :forbidden, :sharing_not_allowed)

      {:error, :forbidden} ->
        not_found(conn)

      {:error, changeset} ->
        PublicError.json_error(conn, :bad_request, changeset)
    end
  end

  def accept_invite(conn, %{"token" => token}) do
    user = Repo.get(User, conn.assigns.current_user_id)

    case CollectionSharing.accept_invite(token, conn.assigns.current_user_id, user && user.email) do
      {:ok, grant} ->
        json(conn, %{success: true, grantId: grant.id, collectionId: grant.collection_id})

      {:error, :email_mismatch} ->
        PublicError.json_error(conn, :forbidden, :email_mismatch)

      {:error, reason} when reason in [:expired, :unavailable] ->
        PublicError.json_error(conn, :gone, "Invitation is no longer available")

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

  defp not_found(conn), do: PublicError.json_error(conn, :not_found, :share)
end
